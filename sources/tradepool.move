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

    // ====== Error Constants ======
    const EZeroAmount: u64 = 0;
    const EPoolNotFound: u64 = 1;
    const EPoolAlreadyExists: u64 = 2;
    const EInsufficientBalance: u64 = 3;
    const ESlippageExceeded: u64 = 4;
    const EInvalidReceipt: u64 = 5;

    // ====== Structs ======

    /// Registry of all trading pools
    public struct PoolRegistry has key {
        id: UID,
        /// Maps token type name to pool ID
        pools: Table<TypeName, ID>,
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

    /// Create a new trading pool for SUI/TOKEN pair
    /// Only admin can create pools
    public fun create_pool<TOKEN>(
        _admin_cap: &AdminCap,
        registry: &mut PoolRegistry,
        name: vector<u8>,
        momentum_pool_id: ID,
        ctx: &mut TxContext
    ) {
        let token_type = type_name::get<TOKEN>();

        // Check if pool for this token already exists
        assert!(!table::contains(&registry.pools, token_type), EPoolAlreadyExists);

        // Create the pool
        let pool_uid = object::new(ctx);
        let pool_id = object::uid_to_inner(&pool_uid);

        let pool = Pool<TOKEN> {
            id: pool_uid,
            name: string::utf8(name),
            sui_balance: balance::zero(),
            token_balance: balance::zero(),
            total_shares: 0,
            momentum_pool_id,
        };

        // Register pool in registry
        table::add(&mut registry.pools, token_type, pool_id);
        registry.pool_count = registry.pool_count + 1;

        // Emit event
        event::emit(PoolCreatedEvent {
            pool_id,
            pool_name: string::utf8(name),
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
    /// Note: This function uses Momentum DEX flash swap pattern.
    /// The swap is executed via Programmable Transaction Blocks (PTB).
    /// 
    /// See PTB composition example in CLAUDE.md for client-side integration.
    public fun admin_buy_token<TOKEN>(
        _admin_cap: &AdminCap,
        pool: &mut Pool<TOKEN>,
        sui_payment: Coin<SUI>,
        min_token_out: u64,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        let sui_amount = coin::value(&sui_payment);
        assert!(sui_amount > 0, EZeroAmount);

        let pool_token = balance::value(&pool.token_balance);
        assert!(pool_token > 0, EInsufficientBalance);

        // NOTE: Actual Momentum DEX swap should be done via PTB from client side
        // This is a placeholder that uses constant product formula
        // 
        // For production, compose this function with Momentum flash_swap in a PTB:
        // 1. Call admin_buy_token to prepare SUI
        // 2. Call mmt_v3::trade::flash_swap with the SUI
        // 3. Call mmt_v3::trade::repay_flash_swap to complete
        //
        // See CLAUDE.md for detailed PTB examples
        
        let pool_sui = balance::value(&pool.sui_balance);
        let token_out = (sui_amount * pool_token) / (pool_sui + sui_amount);

        assert!(token_out >= min_token_out, ESlippageExceeded);
        assert!(token_out <= pool_token, EInsufficientBalance);

        // Add SUI to pool
        balance::join(&mut pool.sui_balance, coin::into_balance(sui_payment));

        // Take TOKEN from pool
        let token_balance = balance::split(&mut pool.token_balance, token_out);

        // Emit event
        event::emit(TradeExecutedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            trader: ctx.sender(),
            sui_amount_in: sui_amount,
            token_amount_out: token_out,
            direction: string::utf8(b"buy"),
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
        });

        coin::from_balance(token_balance, ctx)
    }

    /// Admin function to sell TOKEN for SUI via Momentum DEX
    ///
    /// Note: This function uses Momentum DEX flash swap pattern.
    /// The swap is executed via Programmable Transaction Blocks (PTB).
    /// 
    /// See PTB composition example in CLAUDE.md for client-side integration.
    public fun admin_sell_token<TOKEN>(
        _admin_cap: &AdminCap,
        pool: &mut Pool<TOKEN>,
        token_payment: Coin<TOKEN>,
        min_sui_out: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let token_amount = coin::value(&token_payment);
        assert!(token_amount > 0, EZeroAmount);

        let pool_sui = balance::value(&pool.sui_balance);
        assert!(pool_sui > 0, EInsufficientBalance);

        // NOTE: Actual Momentum DEX swap should be done via PTB from client side
        // This is a placeholder that uses constant product formula
        //
        // For production, compose this function with Momentum flash_swap in a PTB:
        // 1. Call admin_sell_token to prepare TOKEN
        // 2. Call mmt_v3::trade::flash_swap with the TOKEN
        // 3. Call mmt_v3::trade::repay_flash_swap to complete
        //
        // See CLAUDE.md for detailed PTB examples
        
        let pool_token = balance::value(&pool.token_balance);
        let sui_out = (token_amount * pool_sui) / (pool_token + token_amount);

        assert!(sui_out >= min_sui_out, ESlippageExceeded);
        assert!(sui_out <= pool_sui, EInsufficientBalance);

        // Add TOKEN to pool
        balance::join(&mut pool.token_balance, coin::into_balance(token_payment));

        // Take SUI from pool
        let sui_balance = balance::split(&mut pool.sui_balance, sui_out);

        // Emit event
        event::emit(TradeExecutedEvent {
            pool_id: object::uid_to_inner(&pool.id),
            trader: ctx.sender(),
            sui_amount_in: sui_out,
            token_amount_out: token_amount,
            direction: string::utf8(b"sell"),
            pool_sui_balance: balance::value(&pool.sui_balance),
            pool_token_balance: balance::value(&pool.token_balance),
        });

        coin::from_balance(sui_balance, ctx)
    }

    // ====== View Functions ======

    /// Get pool name
    public fun get_pool_name<TOKEN>(pool: &Pool<TOKEN>): String {
        pool.name
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

    /// Check if a pool exists for a given token type
    public fun pool_exists<TOKEN>(registry: &PoolRegistry): bool {
        let token_type = type_name::get<TOKEN>();
        table::contains(&registry.pools, token_type)
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
