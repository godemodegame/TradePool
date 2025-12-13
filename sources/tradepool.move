/// TradePool - Liquidity pools with Momentum DEX integration
///
/// This module provides liquidity pools that integrate with Momentum DEX for token swaps.
/// Supports any SUI/TOKEN pair with generic types.
///
/// # Features:
/// - Generic pool creation for any SUI/TOKEN pair
/// - Dual-token liquidity provision
/// - Momentum DEX integration for swaps
/// - Slippage protection on all trades
/// - Non-fungible LP receipts with merge/split functionality
///
/// # Usage:
/// 1. Admin creates pool with Momentum pool reference
/// 2. Users deposit SUI and TOKEN to provide liquidity
/// 3. Admin executes swaps via Momentum DEX
/// 4. Users withdraw proportional liquidity
///
module tradepool::tradepool {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::clock::Clock;
    use std::string::{Self, String};
    use std::type_name::{Self, TypeName};

    // Momentum DEX imports
    use mmt_v3::pool::{Pool as MomentumPool};
    use mmt_v3::trade;
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
        /// Total LP shares issued
        total_shares: u64,
        /// Reference to Momentum pool for this pair
        momentum_pool_id: ID,
    }

    /// LP Share Receipt - represents ownership in a specific pool
    public struct LPReceipt has key, store {
        id: UID,
        /// ID of the pool this receipt is for
        pool_id: ID,
        /// Type of the token in the pool
        token_type: TypeName,
        /// Amount of shares this receipt represents
        shares: u64,
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

    /// Emitted when admin executes a trade (buy token with SUI)
    public struct TradeExecutedEvent has copy, drop {
        pool_id: ID,
        trader: address,
        sui_amount_in: u64,
        token_amount_out: u64,
        direction: String, // "buy" or "sell"
        pool_sui_balance: u64,
        pool_token_balance: u64,
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
        create_pool_internal<TOKEN>(registry, name, momentum_pool_id, ctx)
    }

    /// Create a new trading pool for SUI/TOKEN pair
    /// Anyone can create a pool for any token type
    public fun create_pool_public<TOKEN>(
        registry: &mut PoolRegistry,
        name: vector<u8>,
        momentum_pool_id: ID,
        ctx: &mut TxContext
    ) {
        create_pool_internal<TOKEN>(registry, name, momentum_pool_id, ctx)
    }

    /// Internal function for pool creation logic
    fun create_pool_internal<TOKEN>(
        registry: &mut PoolRegistry,
        name: vector<u8>,
        momentum_pool_id: ID,
        ctx: &mut TxContext
    ) {
        let token_type = type_name::get<TOKEN>();
        let pool_name = string::utf8(name);

        // Check if pool with this name already exists
        assert!(!table::contains(&registry.pools, pool_name), EPoolAlreadyExists);

        // Create the pool
        let pool_uid = object::new(ctx);
        let pool_id = object::uid_to_inner(&pool_uid);

        let pool = Pool<TOKEN> {
            id: pool_uid,
            name: string::utf8(name),
            admin: ctx.sender(),
            sui_balance: balance::zero(),
            token_balance: balance::zero(),
            total_shares: 0,
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

    /// Deposit both SUI and TOKEN to provide liquidity
    /// Returns an LP receipt representing the depositor's share
    public fun deposit<TOKEN>(
        pool: &mut Pool<TOKEN>,
        sui_payment: Coin<SUI>,
        token_payment: Coin<TOKEN>,
        ctx: &mut TxContext
    ): LPReceipt {
        let sui_amount = coin::value(&sui_payment);
        let token_amount = coin::value(&token_payment);

        assert!(sui_amount > 0 && token_amount > 0, EZeroAmount);

        // Get current pool state
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_token_balance = balance::value(&pool.token_balance);
        let current_total_shares = pool.total_shares;

        // Calculate shares to mint
        let shares_to_mint = if (current_total_shares == 0) {
            // First deposit: geometric mean of amounts
            sui_amount // Simple 1:1 ratio for first deposit
        } else {
            // Subsequent deposits: maintain pool ratio
            let sui_shares = (sui_amount * current_total_shares) / current_sui_balance;
            let token_shares = (token_amount * current_total_shares) / current_token_balance;
            // Take minimum to maintain pool ratio
            if (sui_shares < token_shares) { sui_shares } else { token_shares }
        };

        // Add liquidity to pool
        balance::join(&mut pool.sui_balance, coin::into_balance(sui_payment));
        balance::join(&mut pool.token_balance, coin::into_balance(token_payment));
        pool.total_shares = pool.total_shares + shares_to_mint;

        // Get updated balances for event
        let new_sui_balance = balance::value(&pool.sui_balance);
        let new_token_balance = balance::value(&pool.token_balance);

        // Emit event
        event::emit(DepositEvent {
            pool_id: object::uid_to_inner(&pool.id),
            depositor: ctx.sender(),
            sui_amount,
            token_amount,
            shares_minted: shares_to_mint,
            pool_sui_balance: new_sui_balance,
            pool_token_balance: new_token_balance,
            pool_total_shares: pool.total_shares,
        });

        // Create and return LP receipt
        LPReceipt {
            id: object::new(ctx),
            pool_id: object::uid_to_inner(&pool.id),
            token_type: type_name::get<TOKEN>(),
            shares: shares_to_mint,
        }
    }

    /// Deposit only SUI to the pool (single-sided liquidity provision)
    /// Token balance will be 0 until admin trades or other users deposit tokens
    public fun deposit_sui_only<TOKEN>(
        pool: &mut Pool<TOKEN>,
        sui_coin: Coin<SUI>,
        ctx: &mut TxContext
    ): LPReceipt {
        let sui_amount = coin::value(&sui_coin);
        assert!(sui_amount > 0, EZeroAmount);

        // Add SUI to pool
        let sui_balance = coin::into_balance(sui_coin);
        balance::join(&mut pool.sui_balance, sui_balance);

        // Calculate shares
        // If pool is empty (first deposit), mint shares equal to SUI amount
        // Otherwise, calculate based on current SUI balance ratio
        let shares_to_mint = if (pool.total_shares == 0) {
            sui_amount
        } else {
            let current_sui_balance = balance::value(&pool.sui_balance);
            // shares = (deposit_amount * total_shares) / current_balance
            // We subtract the just-deposited amount to get the previous balance
            (sui_amount * pool.total_shares) / (current_sui_balance - sui_amount)
        };

        // Update total shares
        pool.total_shares = pool.total_shares + shares_to_mint;

        // Get updated balances for event
        let new_sui_balance = balance::value(&pool.sui_balance);
        let new_token_balance = balance::value(&pool.token_balance);

        // Emit event (token_amount = 0 for SUI-only deposits)
        event::emit(DepositEvent {
            pool_id: object::uid_to_inner(&pool.id),
            depositor: ctx.sender(),
            sui_amount,
            token_amount: 0, // No token deposited
            shares_minted: shares_to_mint,
            pool_sui_balance: new_sui_balance,
            pool_token_balance: new_token_balance,
            pool_total_shares: pool.total_shares,
        });

        // Create and return LP receipt
        LPReceipt {
            id: object::new(ctx),
            pool_id: object::uid_to_inner(&pool.id),
            token_type: type_name::get<TOKEN>(),
            shares: shares_to_mint,
        }
    }

    /// Burn LP receipt to withdraw proportional SUI and TOKEN
    public fun withdraw<TOKEN>(
        pool: &mut Pool<TOKEN>,
        receipt: LPReceipt,
        ctx: &mut TxContext
    ): (Coin<SUI>, Coin<TOKEN>) {
        let LPReceipt { id: receipt_id, pool_id, token_type, shares } = receipt;

        // Verify receipt is for this pool
        assert!(pool_id == object::uid_to_inner(&pool.id), EInvalidReceipt);
        assert!(token_type == type_name::get<TOKEN>(), EInvalidReceipt);
        assert!(shares > 0, EZeroAmount);

        // Get current pool state
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_token_balance = balance::value(&pool.token_balance);
        let current_total_shares = pool.total_shares;

        // Calculate proportional amounts to withdraw
        let sui_to_withdraw = (shares * current_sui_balance) / current_total_shares;
        let token_to_withdraw = (shares * current_token_balance) / current_total_shares;

        // Update total shares
        pool.total_shares = pool.total_shares - shares;

        // Split balances from pool
        let sui_balance = balance::split(&mut pool.sui_balance, sui_to_withdraw);
        let token_balance = balance::split(&mut pool.token_balance, token_to_withdraw);

        let sui_coin = coin::from_balance(sui_balance, ctx);
        let token_coin = coin::from_balance(token_balance, ctx);

        // Emit event
        event::emit(WithdrawEvent {
            pool_id,
            withdrawer: ctx.sender(),
            shares_burned: shares,
            sui_amount: sui_to_withdraw,
            token_amount: token_to_withdraw,
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
            pool_total_shares: pool.total_shares,
        });

        // Delete the receipt
        object::delete(receipt_id);

        (sui_coin, token_coin)
    }

    // ====== Admin Trading Functions ======

    /// Admin function to buy TOKEN with SUI via Momentum DEX
    ///
    /// Only the pool admin (creator) can execute this function.
    /// Executes a flash swap on Momentum DEX to trade SUI for TOKEN.
    /// Uses Momentum's CLMM (Concentrated Liquidity Market Maker) for optimal pricing.
    ///
    /// Parameters:
    /// - momentum_pool: Mutable reference to the Momentum CLMM pool for SUI/TOKEN pair
    /// - sqrt_price_limit: Maximum sqrt price (use 0 for no limit, or calculate via TickMath)
    /// - clock: Sui Clock for timestamp validation
    /// - version: Momentum version object for protocol validation
    public fun admin_buy_token<TOKEN>(
        pool: &mut Pool<TOKEN>,
        momentum_pool: &mut MomentumPool<SUI, TOKEN>,
        sui_payment: Coin<SUI>,
        min_token_out: u64,
        sqrt_price_limit: u128,
        clock: &Clock,
        version: &Version,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        // Only pool admin can execute trades
        assert!(ctx.sender() == pool.admin, ENotPoolAdmin);

        let sui_amount = coin::value(&sui_payment);
        assert!(sui_amount > 0, EZeroAmount);

        // Execute flash swap on Momentum DEX
        // is_x_to_y = true (SUI -> TOKEN)
        // exact_input = true (we know exactly how much SUI we're trading)
        let (balance_sui_out, balance_token_out, flash_receipt) = trade::flash_swap<SUI, TOKEN>(
            momentum_pool,
            true,           // is_x_to_y: trading SUI (X) for TOKEN (Y)
            true,           // exact_input: we specify exact SUI amount
            sui_amount,     // amount_specified
            sqrt_price_limit,
            clock,
            version,
            ctx,
        );

        // Get the debt amounts from the flash swap receipt
        let (sui_debt, _token_debt) = trade::swap_receipt_debts(&flash_receipt);

        // Verify we got enough tokens (slippage protection)
        let token_received = balance::value(&balance_token_out);
        assert!(token_received >= min_token_out, ESlippageExceeded);

        // Prepare repayment: we owe SUI debt
        let mut sui_to_repay = coin::into_balance(sui_payment);

        // If there's any excess SUI (shouldn't happen with exact_input), add to pool
        let sui_balance_value = balance::value(&sui_to_repay);
        if (sui_balance_value > sui_debt) {
            let excess = balance::split(&mut sui_to_repay, sui_balance_value - sui_debt);
            balance::join(&mut pool.sui_balance, excess);
        };

        // Create empty token balance for repayment (we don't owe tokens in X->Y swap)
        let empty_token_balance = balance::zero<TOKEN>();

        // Repay the flash swap
        trade::repay_flash_swap<SUI, TOKEN>(
            momentum_pool,
            flash_receipt,
            sui_to_repay,
            empty_token_balance,
            version,
            ctx,
        );

        // Handle the SUI balance returned from flash swap (should be empty for exact input)
        balance::destroy_zero(balance_sui_out);

        // Add received tokens to our pool's reserves
        let token_amount = balance::value(&balance_token_out);
        balance::join(&mut pool.token_balance, balance_token_out);

        // Emit event
        event::emit(TradeExecutedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            trader: ctx.sender(),
            sui_amount_in: sui_amount,
            token_amount_out: token_amount,
            direction: string::utf8(b"buy"),
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
        });

        // Return the tokens as a coin to the admin
        let token_to_return = balance::split(&mut pool.token_balance, token_amount);
        coin::from_balance(token_to_return, ctx)
    }

    /// Admin function to sell TOKEN for SUI via Momentum DEX
    ///
    /// Only the pool admin (creator) can execute this function.
    /// Executes a flash swap on Momentum DEX to trade TOKEN for SUI.
    /// Uses Momentum's CLMM (Concentrated Liquidity Market Maker) for optimal pricing.
    ///
    /// Parameters:
    /// - momentum_pool: Mutable reference to the Momentum CLMM pool for SUI/TOKEN pair
    /// - sqrt_price_limit: Minimum sqrt price (use max u128 for no limit, or calculate via TickMath)
    /// - clock: Sui Clock for timestamp validation
    /// - version: Momentum version object for protocol validation
    public fun admin_sell_token<TOKEN>(
        pool: &mut Pool<TOKEN>,
        momentum_pool: &mut MomentumPool<SUI, TOKEN>,
        token_payment: Coin<TOKEN>,
        min_sui_out: u64,
        sqrt_price_limit: u128,
        clock: &Clock,
        version: &Version,
        ctx: &mut TxContext
    ): Coin<SUI> {
        // Only pool admin can execute trades
        assert!(ctx.sender() == pool.admin, ENotPoolAdmin);

        let token_amount = coin::value(&token_payment);
        assert!(token_amount > 0, EZeroAmount);

        // Execute flash swap on Momentum DEX
        // is_x_to_y = false (TOKEN -> SUI, i.e., Y -> X)
        // exact_input = true (we know exactly how much TOKEN we're trading)
        let (balance_sui_out, balance_token_out, flash_receipt) = trade::flash_swap<SUI, TOKEN>(
            momentum_pool,
            false,          // is_x_to_y: trading TOKEN (Y) for SUI (X)
            true,           // exact_input: we specify exact TOKEN amount
            token_amount,   // amount_specified
            sqrt_price_limit,
            clock,
            version,
            ctx,
        );

        // Get the debt amounts from the flash swap receipt
        let (_sui_debt, token_debt) = trade::swap_receipt_debts(&flash_receipt);

        // Verify we got enough SUI (slippage protection)
        let sui_received = balance::value(&balance_sui_out);
        assert!(sui_received >= min_sui_out, ESlippageExceeded);

        // Prepare repayment: we owe TOKEN debt
        let mut token_to_repay = coin::into_balance(token_payment);

        // If there's any excess TOKEN (shouldn't happen with exact_input), add to pool
        let token_balance_value = balance::value(&token_to_repay);
        if (token_balance_value > token_debt) {
            let excess = balance::split(&mut token_to_repay, token_balance_value - token_debt);
            balance::join(&mut pool.token_balance, excess);
        };

        // Create empty SUI balance for repayment (we don't owe SUI in Y->X swap)
        let empty_sui_balance = balance::zero<SUI>();

        // Repay the flash swap
        trade::repay_flash_swap<SUI, TOKEN>(
            momentum_pool,
            flash_receipt,
            empty_sui_balance,
            token_to_repay,
            version,
            ctx,
        );

        // Handle the TOKEN balance returned from flash swap (should be empty for exact input)
        balance::destroy_zero(balance_token_out);

        // Add received SUI to our pool's reserves
        let sui_amount = balance::value(&balance_sui_out);
        balance::join(&mut pool.sui_balance, balance_sui_out);

        // Emit event
        event::emit(TradeExecutedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            trader: ctx.sender(),
            sui_amount_in: sui_amount,
            token_amount_out: token_amount,
            direction: string::utf8(b"sell"),
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
        });

        // Return the SUI as a coin to the admin
        let sui_to_return = balance::split(&mut pool.sui_balance, sui_amount);
        coin::from_balance(sui_to_return, ctx)
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

    /// Get the total shares issued by the pool
    public fun get_pool_total_shares<TOKEN>(pool: &Pool<TOKEN>): u64 {
        pool.total_shares
    }

    /// Get the Momentum pool ID for this pool
    public fun get_momentum_pool_id<TOKEN>(pool: &Pool<TOKEN>): ID {
        pool.momentum_pool_id
    }

    /// Calculate the value of shares in both SUI and TOKEN
    public fun calculate_share_value<TOKEN>(
        pool: &Pool<TOKEN>,
        share_amount: u64
    ): (u64, u64) {
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_token_balance = balance::value(&pool.token_balance);
        let current_total_shares = pool.total_shares;

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

    /// Get receipt shares amount
    public fun get_receipt_shares(receipt: &LPReceipt): u64 {
        receipt.shares
    }

    /// Get receipt pool ID
    public fun get_receipt_pool_id(receipt: &LPReceipt): ID {
        receipt.pool_id
    }

    /// Get receipt token type
    public fun get_receipt_token_type(receipt: &LPReceipt): TypeName {
        receipt.token_type
    }

    // ====== Receipt Management ======

    /// Merge multiple LP receipts from the same pool into one
    public fun merge_receipts(
        receipt1: &mut LPReceipt,
        receipt2: LPReceipt,
    ) {
        let LPReceipt {
            id: receipt2_id,
            pool_id: pool_id2,
            token_type: token_type2,
            shares: shares2
        } = receipt2;

        // Verify both receipts are for the same pool
        assert!(receipt1.pool_id == pool_id2, EInvalidReceipt);
        assert!(receipt1.token_type == token_type2, EInvalidReceipt);

        // Merge shares
        receipt1.shares = receipt1.shares + shares2;

        // Delete the second receipt
        object::delete(receipt2_id);
    }

    /// Split an LP receipt into two receipts
    public fun split_receipt(
        receipt: &mut LPReceipt,
        split_amount: u64,
        ctx: &mut TxContext
    ): LPReceipt {
        assert!(split_amount > 0 && split_amount < receipt.shares, EInsufficientBalance);

        // Reduce original receipt shares
        receipt.shares = receipt.shares - split_amount;

        // Create new receipt with split amount
        LPReceipt {
            id: object::new(ctx),
            pool_id: receipt.pool_id,
            token_type: receipt.token_type,
            shares: split_amount,
        }
    }

    // ====== Test Only Functions ======

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
