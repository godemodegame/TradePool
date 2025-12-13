/// TradePool - Liquidity pools with Momentum DEX integration
///
/// This module provides liquidity pools that integrate with Momentum DEX CLMM.
/// Supports any SUI/TOKEN pair with generic types.
///
/// # Features:
/// - Generic pool creation for any SUI/TOKEN pair
/// - SUI-only liquidity deposits
/// - Momentum DEX CLMM position management
/// - Concentrated liquidity in custom price ranges
/// - Non-fungible LP receipts with merge/split functionality
///
/// # Usage:
/// 1. Admin creates pool with Momentum pool reference
/// 2. Users deposit SUI to provide liquidity
/// 3. Admin manages Momentum DEX positions (add/remove liquidity in price ranges)
/// 4. Users withdraw proportional liquidity (both SUI and TOKEN)
///
module tradepool::tradepool {
    use sui::balance::{Self, Balance, Supply};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::clock::Clock;
    use std::string::{Self, String};
    use std::type_name::{Self, TypeName};

    // Momentum DEX imports
    use mmt_v3::pool::{Pool as MomentumPool};
    use mmt_v3::position::{Position};
    use mmt_v3::liquidity;
    use mmt_v3::trade;
    use mmt_v3::i32::{I32};
    use mmt_v3::version::{Version};

    // ====== Error Constants ======
    const EZeroAmount: u64 = 0;
    const EPoolNotFound: u64 = 1;
    const EPoolAlreadyExists: u64 = 2;
    const EInsufficientBalance: u64 = 3;
    const ESlippageExceeded: u64 = 4;
    const EInvalidReceipt: u64 = 5;
    const ENotPoolAdmin: u64 = 6;

    // ====== Structs ======

    /// Registry of all trading pools
    public struct PoolRegistry has key {
        id: UID,
        /// Maps pool name to pool ID (allows multiple pools per token)
        pools: Table<String, ID>,
        pool_count: u64,
    }

    /// Admin capability for pool management and trading
    public struct AdminCap has key, store {
        id: UID,
    }

    /// LP Token type - represents shares in a specific pool
    /// Each pool has its own LP token type based on the paired TOKEN
    public struct LPToken<phantom TOKEN> has drop {}

    /// Liquidity pool with two tokens (SUI paired with TOKEN)
    /// Generic over TOKEN type to support any token
    public struct Pool<phantom TOKEN> has key {
        id: UID,
        /// Pool name for identification
        name: String,
        /// Admin address - creator of the pool
        admin: address,
        /// Balance of SUI in the pool
        sui_balance: Balance<SUI>,
        /// Balance of the paired token
        token_balance: Balance<TOKEN>,
        /// Supply of LP tokens for this pool
        lp_supply: Supply<LPToken<TOKEN>>,
        /// Reference to Momentum pool for this pair
        momentum_pool_id: ID,
    }

    // ====== Events ======

    /// Emitted when a new pool is created
    public struct PoolCreatedEvent has copy, drop {
        pool_id: ID,
        pool_name: String,
        token_type: TypeName,
        creator: address,
    }

    /// Emitted when liquidity is deposited
    public struct DepositEvent has copy, drop {
        pool_id: ID,
        depositor: address,
        sui_amount: u64,
        token_amount: u64,
        shares_minted: u64,
        pool_sui_balance: u64,
        pool_token_balance: u64,
        pool_total_shares: u64,
    }

    /// Emitted when liquidity is withdrawn
    public struct WithdrawEvent has copy, drop {
        pool_id: ID,
        withdrawer: address,
        shares_burned: u64,
        sui_amount: u64,
        token_amount: u64,
        pool_sui_balance: u64,
        pool_token_balance: u64,
        pool_total_shares: u64,
    }

    /// Emitted when admin opens a new position in Momentum DEX
    public struct PositionOpenedEvent has copy, drop {
        pool_id: ID,
        admin: address,
        tick_lower: u64,
        tick_upper: u64,
        sui_amount: u64,
        token_amount: u64,
    }

    /// Emitted when admin adds liquidity to a position
    public struct LiquidityAddedEvent has copy, drop {
        pool_id: ID,
        admin: address,
        sui_amount: u64,
        token_amount: u64,
        pool_sui_balance: u64,
        pool_token_balance: u64,
    }

    /// Emitted when admin removes liquidity from a position
    public struct LiquidityRemovedEvent has copy, drop {
        pool_id: ID,
        admin: address,
        sui_amount: u64,
        token_amount: u64,
        pool_sui_balance: u64,
        pool_token_balance: u64,
    }

    /// Emitted when admin closes a position
    public struct PositionClosedEvent has copy, drop {
        pool_id: ID,
        admin: address,
    }

    // ====== Init Function ======

    /// Initialize the trading pool system
    /// Creates PoolRegistry and AdminCap
    fun init(ctx: &mut TxContext) {
        // Create and share the pool registry
        let registry = PoolRegistry {
            id: object::new(ctx),
            pools: table::new(ctx),
            pool_count: 0,
        };
        transfer::share_object(registry);

        // Create and transfer AdminCap to publisher
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, ctx.sender());
    }

    // ====== Pool Creation ======

    /// Create a new trading pool for SUI/TOKEN pair (Admin only - deprecated)
    /// Use create_pool_public instead
    public fun create_pool<TOKEN>(
        _admin_cap: &AdminCap,
        registry: &mut PoolRegistry,
        name: vector<u8>,
        momentum_pool_id: ID,
        ctx: &mut TxContext
    ) {
        create_pool_internal<TOKEN>(registry, name, momentum_pool_id, option::none(), ctx)
    }

    /// Create a new trading pool for SUI/TOKEN pair
    /// Anyone can create a pool for any token type
    /// If admin is not specified (option::none()), the creator becomes the admin
    public fun create_pool_public<TOKEN>(
        registry: &mut PoolRegistry,
        name: vector<u8>,
        momentum_pool_id: ID,
        admin: option::Option<address>,
        ctx: &mut TxContext
    ) {
        create_pool_internal<TOKEN>(registry, name, momentum_pool_id, admin, ctx)
    }

    /// Internal function for pool creation logic
    fun create_pool_internal<TOKEN>(
        registry: &mut PoolRegistry,
        name: vector<u8>,
        momentum_pool_id: ID,
        admin: option::Option<address>,
        ctx: &mut TxContext
    ) {
        let token_type = type_name::get<TOKEN>();
        let pool_name = string::utf8(name);

        // Check if pool with this name already exists
        assert!(!table::contains(&registry.pools, pool_name), EPoolAlreadyExists);

        // Create the pool
        let pool_uid = object::new(ctx);
        let pool_id = object::uid_to_inner(&pool_uid);

        // Determine admin address: use specified admin or default to creator
        let admin_address = if (option::is_some(&admin)) {
            *option::borrow(&admin)
        } else {
            ctx.sender()
        };

        let pool = Pool<TOKEN> {
            id: pool_uid,
            name: string::utf8(name),
            admin: admin_address,
            sui_balance: balance::zero(),
            token_balance: balance::zero(),
            lp_supply: balance::create_supply(LPToken<TOKEN> {}),
            momentum_pool_id,
        };

        // Register pool in registry by name (allows multiple pools per token)
        table::add(&mut registry.pools, pool_name, pool_id);
        registry.pool_count = registry.pool_count + 1;

        // Emit event
        event::emit(PoolCreatedEvent {
            pool_id,
            pool_name,
            token_type,
            creator: ctx.sender(),
        });

        // Share the pool so users can deposit/withdraw
        transfer::share_object(pool);
    }

    // ====== Liquidity Functions ======

    /// Deposit SUI to the pool (single-sided liquidity provision)
    /// Token balance will be acquired through admin trading operations
    /// Returns LP tokens representing the depositor's share
    public fun deposit<TOKEN>(
        pool: &mut Pool<TOKEN>,
        sui_coin: Coin<SUI>,
        ctx: &mut TxContext
    ): Coin<LPToken<TOKEN>> {
        let sui_amount = coin::value(&sui_coin);
        assert!(sui_amount > 0, EZeroAmount);

        // Add SUI to pool
        let sui_balance = coin::into_balance(sui_coin);
        balance::join(&mut pool.sui_balance, sui_balance);

        // Calculate shares
        // If pool is empty (first deposit), mint shares equal to SUI amount
        // Otherwise, calculate based on current SUI balance ratio
        let total_supply = balance::supply_value(&pool.lp_supply);
        let shares_to_mint = if (total_supply == 0) {
            sui_amount
        } else {
            let current_sui_balance = balance::value(&pool.sui_balance);
            // shares = (deposit_amount * total_shares) / current_balance
            // We subtract the just-deposited amount to get the previous balance
            (sui_amount * total_supply) / (current_sui_balance - sui_amount)
        };

        // Mint LP tokens
        let lp_balance = balance::increase_supply(&mut pool.lp_supply, shares_to_mint);

        // Get updated balances for event
        let new_sui_balance = balance::value(&pool.sui_balance);
        let new_token_balance = balance::value(&pool.token_balance);
        let new_total_supply = balance::supply_value(&pool.lp_supply);

        // Emit event (token_amount = 0 for SUI-only deposits)
        event::emit(DepositEvent {
            pool_id: object::uid_to_inner(&pool.id),
            depositor: ctx.sender(),
            sui_amount,
            token_amount: 0, // No token deposited
            shares_minted: shares_to_mint,
            pool_sui_balance: new_sui_balance,
            pool_token_balance: new_token_balance,
            pool_total_shares: new_total_supply,
        });

        // Convert LP balance to coin and return
        coin::from_balance(lp_balance, ctx)
    }

    /// Burn LP tokens to withdraw proportional SUI and TOKEN
    public fun withdraw<TOKEN>(
        pool: &mut Pool<TOKEN>,
        lp_coin: Coin<LPToken<TOKEN>>,
        ctx: &mut TxContext
    ): (Coin<SUI>, Coin<TOKEN>) {
        let lp_balance = coin::into_balance(lp_coin);
        let shares = balance::value(&lp_balance);
        assert!(shares > 0, EZeroAmount);

        // Get current pool state
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_token_balance = balance::value(&pool.token_balance);
        let current_total_shares = balance::supply_value(&pool.lp_supply);

        // Calculate proportional amounts to withdraw
        let sui_to_withdraw = (shares * current_sui_balance) / current_total_shares;
        let token_to_withdraw = (shares * current_token_balance) / current_total_shares;

        // Burn LP tokens
        balance::decrease_supply(&mut pool.lp_supply, lp_balance);

        // Split balances from pool
        let sui_balance = balance::split(&mut pool.sui_balance, sui_to_withdraw);
        let token_balance = balance::split(&mut pool.token_balance, token_to_withdraw);

        let sui_coin = coin::from_balance(sui_balance, ctx);
        let token_coin = coin::from_balance(token_balance, ctx);

        // Emit event
        event::emit(WithdrawEvent {
            pool_id: object::uid_to_inner(&pool.id),
            withdrawer: ctx.sender(),
            shares_burned: shares,
            sui_amount: sui_to_withdraw,
            token_amount: token_to_withdraw,
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
            pool_total_shares: balance::supply_value(&pool.lp_supply),
        });

        (sui_coin, token_coin)
    }

    // ====== Admin Liquidity Management Functions ======

    /// Simplified admin function to deposit SUI and create a position (accepts u32 ticks)
    ///
    /// This is a wrapper around admin_deposit_sui that accepts simple u32 tick values
    /// instead of I32 structs, making it easier to call from PTB.
    ///
    /// Parameters:
    /// - tick_lower_u32: Lower tick boundary as u32 (must be divisible by tick_spacing)
    /// - tick_upper_u32: Upper tick boundary as u32 (must be divisible by tick_spacing)
    /// - Other parameters same as admin_deposit_sui
    public fun admin_deposit_sui_simple<TOKEN>(
        pool: &mut Pool<TOKEN>,
        momentum_pool: &mut MomentumPool<TOKEN, SUI>,
        tick_lower_u32: u32,
        tick_upper_u32: u32,
        sui_coin: Coin<SUI>,
        min_token_out: u64,
        sqrt_price_limit: u128,
        clock: &Clock,
        version: &Version,
        ctx: &mut TxContext
    ): (Position, Coin<TOKEN>, Coin<SUI>) {
        // Convert u32 to I32
        let tick_lower = mmt_v3::i32::from(tick_lower_u32);
        let tick_upper = mmt_v3::i32::from(tick_upper_u32);

        // Call the main function
        admin_deposit_sui(
            pool,
            momentum_pool,
            tick_lower,
            tick_upper,
            sui_coin,
            min_token_out,
            sqrt_price_limit,
            clock,
            version,
            ctx
        )
    }

    /// Admin function to deposit SUI and automatically create a position
    ///
    /// Only the pool admin (creator) can execute this function.
    /// Takes SUI, automatically swaps half to TOKEN, and adds liquidity to Momentum DEX.
    ///
    /// Parameters:
    /// - momentum_pool: Mutable reference to the Momentum CLMM pool for SUI/TOKEN pair
    /// - tick_lower: Lower tick boundary of the price range
    /// - tick_upper: Upper tick boundary of the price range
    /// - sui_coin: SUI to deposit (will be split: half for SUI, half swapped to TOKEN)
    /// - min_token_out: Minimum TOKEN to receive from swap (slippage protection)
    /// - sqrt_price_limit: Price limit for swap (0 for no limit)
    /// - clock: Sui Clock for timestamp validation
    /// - version: Momentum version object for protocol validation
    ///
    /// Returns: Position object and refund coins (if any)
    public fun admin_deposit_sui<TOKEN>(
        pool: &mut Pool<TOKEN>,
        momentum_pool: &mut MomentumPool<TOKEN, SUI>,
        tick_lower: I32,
        tick_upper: I32,
        mut sui_coin: Coin<SUI>,
        min_token_out: u64,
        sqrt_price_limit: u128,
        clock: &Clock,
        version: &Version,
        ctx: &mut TxContext
    ): (Position, Coin<TOKEN>, Coin<SUI>) {
        // Only pool admin can manage liquidity
        assert!(ctx.sender() == pool.admin, ENotPoolAdmin);

        let total_sui = coin::value(&sui_coin);
        assert!(total_sui > 0, EZeroAmount);

        // Split SUI: half for liquidity, half to swap for TOKEN
        let sui_for_swap = total_sui / 2;
        let sui_for_liquidity = total_sui - sui_for_swap;

        let sui_to_swap = coin::split(&mut sui_coin, sui_for_swap, ctx);

        // Swap SUI -> TOKEN using flash swap
        // Pool is <TOKEN, SUI>, so SUI (Y) -> TOKEN (X) means is_x_to_y = false
        let (balance_token_out, balance_sui_out, flash_receipt) = trade::flash_swap<TOKEN, SUI>(
            momentum_pool,
            false,  // is_x_to_y: SUI (Y) -> TOKEN (X), so false
            true,  // exact_input
            sui_for_swap,
            sqrt_price_limit,
            clock,
            version,
            ctx,
        );

        // Get debts from flash swap
        let (_token_debt, _sui_debt) = trade::swap_receipt_debts(&flash_receipt);

        // Verify slippage
        let token_received = balance::value(&balance_token_out);
        assert!(token_received >= min_token_out, ESlippageExceeded);

        // Repay flash swap
        let sui_payment = coin::into_balance(sui_to_swap);
        let empty_token = balance::zero<TOKEN>();
        trade::repay_flash_swap<TOKEN, SUI>(
            momentum_pool,
            flash_receipt,
            empty_token,
            sui_payment,
            version,
            ctx,
        );

        balance::destroy_zero(balance_sui_out);

        // Create TOKEN coin from swapped balance
        let token_coin = coin::from_balance(balance_token_out, ctx);

        // Open position
        let mut position = liquidity::open_position<TOKEN, SUI>(
            momentum_pool,
            tick_lower,
            tick_upper,
            version,
            ctx,
        );

        // Add liquidity to position
        // Pool is <TOKEN, SUI>, so token_coin first, sui_coin second
        let (token_refund, sui_refund) = liquidity::add_liquidity<TOKEN, SUI>(
            momentum_pool,
            &mut position,
            token_coin,
            sui_coin,  // Remaining SUI
            0,  // min amounts (already checked via swap slippage)
            0,
            clock,
            version,
            ctx,
        );

        // Emit event
        event::emit(PositionOpenedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            admin: ctx.sender(),
            tick_lower: 0,
            tick_upper: 0,
            sui_amount: sui_for_liquidity - coin::value(&sui_refund),
            token_amount: token_received - coin::value(&token_refund),
        });

        (position, token_refund, sui_refund)
    }

    /// Admin function to add more SUI to an existing position (auto-swaps to TOKEN)
    ///
    /// Only the pool admin can execute this function.
    /// Takes SUI, swaps half to TOKEN, and adds both to the position.
    ///
    /// Parameters:
    /// - position: Mutable reference to the position
    /// - momentum_pool: Mutable reference to the Momentum CLMM pool
    /// - sui_coin: SUI to add (half will be swapped to TOKEN)
    /// - min_token_out: Minimum TOKEN from swap (slippage protection)
    /// - sqrt_price_limit: Price limit for swap
    /// - clock: Sui Clock
    /// - version: Momentum version object
    ///
    /// Returns: Refund coins (if any)
    public fun admin_add_sui_to_position<TOKEN>(
        pool: &mut Pool<TOKEN>,
        momentum_pool: &mut MomentumPool<TOKEN, SUI>,
        position: &mut Position,
        mut sui_coin: Coin<SUI>,
        min_token_out: u64,
        sqrt_price_limit: u128,
        clock: &Clock,
        version: &Version,
        ctx: &mut TxContext
    ): (Coin<TOKEN>, Coin<SUI>) {
        // Only pool admin can manage liquidity
        assert!(ctx.sender() == pool.admin, ENotPoolAdmin);

        let total_sui = coin::value(&sui_coin);
        assert!(total_sui > 0, EZeroAmount);

        // Split SUI for swap
        let sui_for_swap = total_sui / 2;
        let sui_to_swap = coin::split(&mut sui_coin, sui_for_swap, ctx);

        // Swap SUI -> TOKEN
        // Pool is <TOKEN, SUI>, so SUI (Y) -> TOKEN (X) means is_x_to_y = false
        let (balance_token_out, balance_sui_out, flash_receipt) = trade::flash_swap<TOKEN, SUI>(
            momentum_pool,
            false,
            true,
            sui_for_swap,
            sqrt_price_limit,
            clock,
            version,
            ctx,
        );

        let (_token_debt, _sui_debt) = trade::swap_receipt_debts(&flash_receipt);
        let token_received = balance::value(&balance_token_out);
        assert!(token_received >= min_token_out, ESlippageExceeded);

        // Repay swap
        trade::repay_flash_swap<TOKEN, SUI>(
            momentum_pool,
            flash_receipt,
            balance::zero<TOKEN>(),
            coin::into_balance(sui_to_swap),
            version,
            ctx,
        );

        balance::destroy_zero(balance_sui_out);
        let token_coin = coin::from_balance(balance_token_out, ctx);

        // Add liquidity
        let (token_refund, sui_refund) = liquidity::add_liquidity<TOKEN, SUI>(
            momentum_pool,
            position,
            token_coin,
            sui_coin,
            0,
            0,
            clock,
            version,
            ctx,
        );

        // Emit event
        event::emit(LiquidityAddedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            admin: ctx.sender(),
            sui_amount: total_sui / 2 - coin::value(&sui_refund),
            token_amount: token_received - coin::value(&token_refund),
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
        });

        (token_refund, sui_refund)
    }

    /// Admin function to remove liquidity and convert everything to SUI
    ///
    /// Only the pool admin can execute this function.
    /// Removes liquidity, swaps TOKEN back to SUI, and returns total SUI.
    ///
    /// Parameters:
    /// - position: Mutable reference to the position
    /// - momentum_pool: Mutable reference to the Momentum CLMM pool
    /// - liquidity_amount: Amount of liquidity to remove (u128)
    /// - min_sui_out: Minimum total SUI to receive after swap (slippage protection)
    /// - sqrt_price_limit: Price limit for TOKEN->SUI swap
    /// - clock: Sui Clock
    /// - version: Momentum version object
    ///
    /// Returns: Total SUI (from removed liquidity + swapped TOKEN)
    public fun admin_withdraw_to_sui<TOKEN>(
        pool: &mut Pool<TOKEN>,
        momentum_pool: &mut MomentumPool<TOKEN, SUI>,
        position: &mut Position,
        liquidity_amount: u128,
        min_sui_out: u64,
        sqrt_price_limit: u128,
        clock: &Clock,
        version: &Version,
        ctx: &mut TxContext
    ): Coin<SUI> {
        // Only pool admin can manage liquidity
        assert!(ctx.sender() == pool.admin, ENotPoolAdmin);

        // Remove liquidity from position
        // Pool is <TOKEN, SUI>, so returns (token_coin, sui_coin)
        let (token_coin, mut sui_coin) = liquidity::remove_liquidity<TOKEN, SUI>(
            momentum_pool,
            position,
            liquidity_amount,
            0,  // No min, we check total at the end
            0,
            clock,
            version,
            ctx,
        );

        let _sui_from_position = coin::value(&sui_coin);
        let token_amount = coin::value(&token_coin);

        // If we got tokens, swap them back to SUI
        if (token_amount > 0) {
            // Swap TOKEN -> SUI
            // Pool is <TOKEN, SUI>, so TOKEN (X) -> SUI (Y) means is_x_to_y = true
            let (balance_token_out, balance_sui_out, flash_receipt) = trade::flash_swap<TOKEN, SUI>(
                momentum_pool,
                true,  // is_x_to_y: TOKEN (X) -> SUI (Y)
                true,   // exact_input
                token_amount,
                sqrt_price_limit,
                clock,
                version,
                ctx,
            );

            let (_token_debt, _sui_debt) = trade::swap_receipt_debts(&flash_receipt);
            let _sui_from_swap = balance::value(&balance_sui_out);

            // Repay flash swap with TOKEN
            trade::repay_flash_swap<TOKEN, SUI>(
                momentum_pool,
                flash_receipt,
                coin::into_balance(token_coin),
                balance::zero<SUI>(),
                version,
                ctx,
            );

            balance::destroy_zero(balance_token_out);

            // Add swapped SUI to our coin
            coin::join(&mut sui_coin, coin::from_balance(balance_sui_out, ctx));
        } else {
            // No tokens, destroy empty coin
            coin::destroy_zero(token_coin);
        };

        let total_sui = coin::value(&sui_coin);
        assert!(total_sui >= min_sui_out, ESlippageExceeded);

        // Emit event
        event::emit(LiquidityRemovedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            admin: ctx.sender(),
            sui_amount: total_sui,
            token_amount: token_amount,
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
        });

        sui_coin
    }

    /// Admin function to close an empty position
    ///
    /// Only the pool admin can execute this function.
    /// The position must be empty (all liquidity removed) before it can be closed.
    ///
    /// Parameters:
    /// - position: The position to close
    /// - version: Momentum version object
    public fun admin_close_position<TOKEN>(
        pool: &Pool<TOKEN>,
        position: Position,
        version: &Version,
        ctx: &TxContext
    ) {
        // Only pool admin can manage liquidity
        assert!(ctx.sender() == pool.admin, ENotPoolAdmin);

        // Close the position (will abort if not empty)
        liquidity::close_position(position, version, ctx);

        // Emit event
        event::emit(PositionClosedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            admin: ctx.sender(),
        });
    }

    // ====== View Functions ======

    /// Get pool name
    public fun get_pool_name<TOKEN>(pool: &Pool<TOKEN>): String {
        pool.name
    }

    /// Get pool admin address
    public fun get_pool_admin<TOKEN>(pool: &Pool<TOKEN>): address {
        pool.admin
    }

    /// Get the current SUI balance in the pool
    public fun get_pool_sui_balance<TOKEN>(pool: &Pool<TOKEN>): u64 {
        balance::value(&pool.sui_balance)
    }

    /// Get the current TOKEN balance in the pool
    public fun get_pool_token_balance<TOKEN>(pool: &Pool<TOKEN>): u64 {
        balance::value(&pool.token_balance)
    }

    /// Get the total LP tokens in circulation for the pool
    public fun get_pool_total_shares<TOKEN>(pool: &Pool<TOKEN>): u64 {
        balance::supply_value(&pool.lp_supply)
    }

    /// Get the Momentum pool ID for this pool
    public fun get_momentum_pool_id<TOKEN>(pool: &Pool<TOKEN>): ID {
        pool.momentum_pool_id
    }

    /// Calculate the value of LP tokens in both SUI and TOKEN
    public fun calculate_share_value<TOKEN>(
        pool: &Pool<TOKEN>,
        share_amount: u64
    ): (u64, u64) {
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_token_balance = balance::value(&pool.token_balance);
        let current_total_shares = balance::supply_value(&pool.lp_supply);

        if (current_total_shares == 0) {
            (0, 0)
        } else {
            let sui_value = (share_amount * current_sui_balance) / current_total_shares;
            let token_value = (share_amount * current_token_balance) / current_total_shares;
            (sui_value, token_value)
        }
    }

    /// Get total number of pools created
    public fun get_pool_count(registry: &PoolRegistry): u64 {
        registry.pool_count
    }

    /// Check if a pool exists with a given name
    public fun pool_exists(registry: &PoolRegistry, pool_name: String): bool {
        table::contains(&registry.pools, pool_name)
    }

    /// Check if a pool exists for a given token type (deprecated - use pool_exists with name)
    /// Returns false since pools are now identified by name, not token type
    public fun pool_exists_by_type<TOKEN>(registry: &PoolRegistry): bool {
        let _ = type_name::get<TOKEN>();
        let _ = registry;
        false
    }

    // ====== Receipt Management ======

    // Note: LP tokens are now Coin<LPToken<TOKEN>> which have built-in merge/split
    // Use coin::join() to merge and coin::split() to split LP tokens

    // ====== Test Only Functions ======

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
