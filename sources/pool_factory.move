module tradepool::pool_factory {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use std::string::{Self, String};

    // ====== Error Constants ======
    const EZeroAmount: u64 = 0;
    const EPoolNameTaken: u64 = 2;
    const EInsufficientShares: u64 = 3;

    // ====== Structs ======

    /// Factory capability - controls pool creation
    public struct FactoryCap has key, store {
        id: UID,
    }

    /// Registry of all created pools
    public struct PoolRegistry has key {
        id: UID,
        /// Maps pool name to pool ID
        pools: Table<String, ID>,
        /// Total number of pools created
        pool_count: u64,
    }

    /// Individual liquidity pool
    /// Each pool is a shared object that anyone can deposit/withdraw from
    public struct Pool has key {
        id: UID,
        /// Name of the pool
        name: String,
        /// Type of token that will be traded with SUI (stored as string address)
        token_type: String,
        /// Balance of SUI in the pool
        sui_balance: Balance<SUI>,
        /// Total LP shares issued
        total_shares: u64,
    }

    /// LP Share Receipt - represents ownership in a specific pool
    /// Users receive this when they deposit SUI
    public struct LPReceipt has key, store {
        id: UID,
        /// ID of the pool this receipt is for
        pool_id: ID,
        /// Amount of shares this receipt represents
        shares: u64,
    }

    // ====== Events ======

    /// Emitted when a new pool is created
    public struct PoolCreatedEvent has copy, drop {
        pool_id: ID,
        pool_name: String,
        token_type: String,
        creator: address,
    }

    /// Emitted when a user deposits SUI
    public struct DepositEvent has copy, drop {
        pool_id: ID,
        depositor: address,
        sui_amount: u64,
        shares_minted: u64,
        pool_sui_balance: u64,
        pool_total_shares: u64,
    }

    /// Emitted when a user withdraws SUI
    public struct WithdrawEvent has copy, drop {
        pool_id: ID,
        withdrawer: address,
        shares_burned: u64,
        sui_amount: u64,
        pool_sui_balance: u64,
        pool_total_shares: u64,
    }

    // ====== Init Function ======

    /// Initialize the pool factory
    fun init(ctx: &mut TxContext) {
        // Create and transfer factory capability to deployer
        let factory_cap = FactoryCap {
            id: object::new(ctx),
        };
        transfer::transfer(factory_cap, ctx.sender());

        // Create and share the pool registry
        let registry = PoolRegistry {
            id: object::new(ctx),
            pools: table::new(ctx),
            pool_count: 0,
        };
        transfer::share_object(registry);
    }

    // ====== Factory Functions ======

    /// Create a new pool with a unique name and token type
    /// The pool is created as a shared object that anyone can interact with
    ///
    /// # Arguments
    /// * `registry` - Mutable reference to the pool registry
    /// * `name` - Unique name for the pool
    /// * `token_type` - Address/type of the token that will be paired with SUI
    /// * `ctx` - Transaction context
    public fun create_pool(
        registry: &mut PoolRegistry,
        name: vector<u8>,
        token_type: vector<u8>,
        ctx: &mut TxContext
    ) {
        let pool_name = string::utf8(name);
        let token_type_string = string::utf8(token_type);

        // Check if pool name is already taken
        assert!(!table::contains(&registry.pools, pool_name), EPoolNameTaken);

        // Create the pool
        let pool_uid = object::new(ctx);
        let pool_id = object::uid_to_inner(&pool_uid);

        let pool = Pool {
            id: pool_uid,
            name: pool_name,
            token_type: token_type_string,
            sui_balance: balance::zero(),
            total_shares: 0,
        };

        // Register pool in registry
        table::add(&mut registry.pools, pool_name, pool_id);
        registry.pool_count = registry.pool_count + 1;

        // Emit event
        event::emit(PoolCreatedEvent {
            pool_id,
            pool_name,
            token_type: token_type_string,
            creator: ctx.sender(),
        });

        // Share the pool so anyone can use it
        transfer::share_object(pool);
    }

    // ====== Pool Operations ======

    /// Deposit SUI into a pool and receive an LP receipt
    ///
    /// # Share Calculation
    /// - First deposit: shares = SUI amount (1:1 ratio)
    /// - Subsequent deposits: shares = (SUI amount × total shares) ÷ SUI balance
    public fun deposit(
        pool: &mut Pool,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ): LPReceipt {
        let sui_amount = coin::value(&payment);
        assert!(sui_amount > 0, EZeroAmount);

        // Get current pool state
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_total_shares = pool.total_shares;

        // Calculate shares to issue
        let shares_to_mint = if (current_sui_balance == 0) {
            // First deposit: 1:1 ratio
            sui_amount
        } else {
            // Subsequent deposits: proportional to pool ratio
            (sui_amount * current_total_shares) / current_sui_balance
        };

        // Add SUI to pool
        balance::join(&mut pool.sui_balance, coin::into_balance(payment));

        // Update total shares
        pool.total_shares = pool.total_shares + shares_to_mint;

        // Get updated balances for event
        let new_sui_balance = balance::value(&pool.sui_balance);
        let new_total_shares = pool.total_shares;

        // Emit event
        event::emit(DepositEvent {
            pool_id: object::uid_to_inner(&pool.id),
            depositor: ctx.sender(),
            sui_amount,
            shares_minted: shares_to_mint,
            pool_sui_balance: new_sui_balance,
            pool_total_shares: new_total_shares,
        });

        // Create and return LP receipt
        LPReceipt {
            id: object::new(ctx),
            pool_id: object::uid_to_inner(&pool.id),
            shares: shares_to_mint,
        }
    }

    /// Burn an LP receipt to withdraw proportional SUI from pool
    ///
    /// # Withdrawal Calculation
    /// SUI to withdraw = (shares × SUI balance) ÷ total shares
    public fun withdraw(
        pool: &mut Pool,
        receipt: LPReceipt,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let LPReceipt { id: receipt_id, pool_id, shares } = receipt;

        // Verify receipt is for this pool
        assert!(pool_id == object::uid_to_inner(&pool.id), EInsufficientShares);
        assert!(shares > 0, EZeroAmount);

        // Get current pool state
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_total_shares = pool.total_shares;

        // Calculate proportional SUI to withdraw
        let sui_to_withdraw = (shares * current_sui_balance) / current_total_shares;

        // Update total shares
        pool.total_shares = pool.total_shares - shares;

        // Split SUI from pool
        let sui_balance = balance::split(&mut pool.sui_balance, sui_to_withdraw);
        let sui_coin = coin::from_balance(sui_balance, ctx);

        // Get updated balances for event
        let new_sui_balance = balance::value(&pool.sui_balance);
        let new_total_shares = pool.total_shares;

        // Emit event
        event::emit(WithdrawEvent {
            pool_id,
            withdrawer: ctx.sender(),
            shares_burned: shares,
            sui_amount: sui_to_withdraw,
            pool_sui_balance: new_sui_balance,
            pool_total_shares: new_total_shares,
        });

        // Delete the receipt
        object::delete(receipt_id);

        sui_coin
    }

    /// Merge multiple LP receipts from the same pool into one
    public fun merge_receipts(
        receipt1: &mut LPReceipt,
        receipt2: LPReceipt,
    ) {
        let LPReceipt { id: receipt2_id, pool_id: pool_id2, shares: shares2 } = receipt2;

        // Verify both receipts are for the same pool
        assert!(receipt1.pool_id == pool_id2, EInsufficientShares);

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
        assert!(split_amount > 0 && split_amount < receipt.shares, EInsufficientShares);

        // Reduce original receipt shares
        receipt.shares = receipt.shares - split_amount;

        // Create new receipt with split amount
        LPReceipt {
            id: object::new(ctx),
            pool_id: receipt.pool_id,
            shares: split_amount,
        }
    }

    // ====== View Functions ======

    /// Get pool name
    public fun get_pool_name(pool: &Pool): String {
        pool.name
    }

    /// Get the token type that will be paired with SUI
    public fun get_pool_token_type(pool: &Pool): String {
        pool.token_type
    }

    /// Get the current SUI balance in the pool
    public fun get_pool_sui_balance(pool: &Pool): u64 {
        balance::value(&pool.sui_balance)
    }

    /// Get the total shares issued by the pool
    public fun get_pool_total_shares(pool: &Pool): u64 {
        pool.total_shares
    }

    /// Calculate the SUI value of a given amount of shares
    public fun calculate_share_value(pool: &Pool, share_amount: u64): u64 {
        let current_sui_balance = balance::value(&pool.sui_balance);
        let current_total_shares = pool.total_shares;

        if (current_total_shares == 0) {
            0
        } else {
            (share_amount * current_sui_balance) / current_total_shares
        }
    }

    /// Get total number of pools created
    public fun get_pool_count(registry: &PoolRegistry): u64 {
        registry.pool_count
    }

    /// Check if a pool name exists
    public fun pool_exists(registry: &PoolRegistry, name: String): bool {
        table::contains(&registry.pools, name)
    }

    /// Get receipt shares amount
    public fun get_receipt_shares(receipt: &LPReceipt): u64 {
        receipt.shares
    }

    /// Get receipt pool ID
    public fun get_receipt_pool_id(receipt: &LPReceipt): ID {
        receipt.pool_id
    }

    // ====== Test Only Functions ======

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
