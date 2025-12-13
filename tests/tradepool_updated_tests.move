#[test_only]
module tradepool::tradepool_updated_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::object;
    use tradepool::tradepool::{Self, Pool, PoolRegistry, AdminCap, LPReceipt};

    // Mock token for testing
    public struct USDC has drop {}

    // Test addresses
    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA;
    const BOB: address = @0xB;

    // Test amounts
    const INITIAL_SUI: u64 = 10_000_000_000; // 10 SUI
    
    // Error codes (from tradepool module)
    const EZeroAmount: u64 = 0;
    const EPoolAlreadyExists: u64 = 2;

    // ====== Test Helpers ======

    fun init_for_testing(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            tradepool::init_for_testing(ts::ctx(scenario));
        };
    }

    // ====== Basic Tests ======

    #[test]
    fun test_init() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<PoolRegistry>(&scenario);
            assert!(tradepool::get_pool_count(&registry) == 0, 0);
            ts::return_shared(registry);
        };

        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_create_pool() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);

            // Create a dummy momentum pool ID for testing
            let dummy_momentum_pool_id = object::id_from_address(@0x1234);
            
            tradepool::create_pool<USDC>(
                &admin_cap,
                &mut registry,
                b"SUI-USDC Pool",
                dummy_momentum_pool_id,
                ts::ctx(&mut scenario)
            );

            assert!(tradepool::get_pool_count(&registry) == 1, 0);
            assert!(tradepool::pool_exists<USDC>(&registry), 1);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_first_deposit() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        // Create pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", dummy_pool_id, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Alice deposits
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let usdc_payment = coin::mint_for_testing<USDC>(1000, ts::ctx(&mut scenario));

            let receipt = tradepool::deposit<USDC>(
                &mut pool,
                sui_payment,
                usdc_payment,
                ts::ctx(&mut scenario)
            );

            // Verify pool state
            assert!(tradepool::get_pool_sui_balance(&pool) == 1000, 0);
            assert!(tradepool::get_pool_token_balance(&pool) == 1000, 1);
            assert!(tradepool::get_pool_total_shares(&pool) == 1000, 2);

            // Verify receipt
            assert!(tradepool::get_receipt_shares(&receipt) == 1000, 3);

            ts::return_shared(pool);
            transfer::public_transfer(receipt, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_proportional_deposit() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        // Create pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", dummy_pool_id, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Alice first deposit: 1000 SUI + 1000 USDC
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let usdc_payment = coin::mint_for_testing<USDC>(1000, ts::ctx(&mut scenario));
            let receipt = tradepool::deposit<USDC>(&mut pool, sui_payment, usdc_payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(receipt, ALICE);
        };

        // Bob deposits: 2000 SUI + 2000 USDC (2x Alice's amount)
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(2000, ts::ctx(&mut scenario));
            let usdc_payment = coin::mint_for_testing<USDC>(2000, ts::ctx(&mut scenario));
            let receipt = tradepool::deposit<USDC>(&mut pool, sui_payment, usdc_payment, ts::ctx(&mut scenario));

            // Pool should have 3000 SUI + 3000 USDC, 3000 shares
            assert!(tradepool::get_pool_sui_balance(&pool) == 3000, 0);
            assert!(tradepool::get_pool_token_balance(&pool) == 3000, 1);
            assert!(tradepool::get_pool_total_shares(&pool) == 3000, 2);

            // Bob should get 2000 shares (proportional)
            assert!(tradepool::get_receipt_shares(&receipt) == 2000, 3);

            ts::return_shared(pool);
            transfer::public_transfer(receipt, BOB);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_withdraw() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        // Create pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", dummy_pool_id, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Alice deposits
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let usdc_payment = coin::mint_for_testing<USDC>(1000, ts::ctx(&mut scenario));
            let receipt = tradepool::deposit<USDC>(&mut pool, sui_payment, usdc_payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(receipt, ALICE);
        };

        // Alice withdraws
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let receipt = ts::take_from_sender<LPReceipt>(&scenario);
            
            let (sui_coin, usdc_coin) = tradepool::withdraw<USDC>(&mut pool, receipt, ts::ctx(&mut scenario));

            // Verify Alice got her tokens back
            assert!(coin::value(&sui_coin) == 1000, 0);
            assert!(coin::value(&usdc_coin) == 1000, 1);

            // Pool should be empty again
            assert!(tradepool::get_pool_sui_balance(&pool) == 0, 2);
            assert!(tradepool::get_pool_token_balance(&pool) == 0, 3);
            assert!(tradepool::get_pool_total_shares(&pool) == 0, 4);

            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, ALICE);
            transfer::public_transfer(usdc_coin, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_partial_withdraw() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        // Create pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", dummy_pool_id, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Alice deposits 1000 SUI + 1000 USDC
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let usdc_payment = coin::mint_for_testing<USDC>(1000, ts::ctx(&mut scenario));
            let receipt = tradepool::deposit<USDC>(&mut pool, sui_payment, usdc_payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(receipt, ALICE);
        };

        // Alice splits and withdraws half
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let mut receipt = ts::take_from_sender<LPReceipt>(&scenario);
            
            let half_receipt = tradepool::split_receipt(&mut receipt, 500, ts::ctx(&mut scenario));
            let (sui_coin, usdc_coin) = tradepool::withdraw<USDC>(&mut pool, half_receipt, ts::ctx(&mut scenario));

            // Verify Alice got half back
            assert!(coin::value(&sui_coin) == 500, 0);
            assert!(coin::value(&usdc_coin) == 500, 1);

            // Pool should have half remaining
            assert!(tradepool::get_pool_sui_balance(&pool) == 500, 2);
            assert!(tradepool::get_pool_token_balance(&pool) == 500, 3);
            assert!(tradepool::get_pool_total_shares(&pool) == 500, 4);

            // Receipt should have 500 shares left
            assert!(tradepool::get_receipt_shares(&receipt) == 500, 5);

            ts::return_shared(pool);
            transfer::public_transfer(receipt, ALICE);
            transfer::public_transfer(sui_coin, ALICE);
            transfer::public_transfer(usdc_coin, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_merge_receipts() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        // Create pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", dummy_pool_id, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Alice makes two deposits
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            
            // First deposit
            let sui1 = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            let usdc1 = coin::mint_for_testing<USDC>(500, ts::ctx(&mut scenario));
            let receipt1 = tradepool::deposit<USDC>(&mut pool, sui1, usdc1, ts::ctx(&mut scenario));
            
            // Second deposit
            let sui2 = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            let usdc2 = coin::mint_for_testing<USDC>(500, ts::ctx(&mut scenario));
            let receipt2 = tradepool::deposit<USDC>(&mut pool, sui2, usdc2, ts::ctx(&mut scenario));

            // Merge receipts
            let mut merged = receipt1;
            tradepool::merge_receipts(&mut merged, receipt2);

            // Merged receipt should have 1000 shares
            assert!(tradepool::get_receipt_shares(&merged) == 1000, 0);

            ts::return_shared(pool);
            transfer::public_transfer(merged, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_deposit_zero_sui() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", dummy_pool_id, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(0, ts::ctx(&mut scenario));
            let usdc_payment = coin::mint_for_testing<USDC>(1000, ts::ctx(&mut scenario));
            let receipt = tradepool::deposit<USDC>(&mut pool, sui_payment, usdc_payment, ts::ctx(&mut scenario));
            
            ts::return_shared(pool);
            transfer::public_transfer(receipt, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_create_duplicate_pool() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"Pool1", dummy_pool_id, ts::ctx(&mut scenario));
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"Pool2", dummy_pool_id, ts::ctx(&mut scenario)); // Should fail
            
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_calculate_share_value() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        // Create pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", dummy_pool_id, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Deposit
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let usdc_payment = coin::mint_for_testing<USDC>(2000, ts::ctx(&mut scenario));
            let receipt = tradepool::deposit<USDC>(&mut pool, sui_payment, usdc_payment, ts::ctx(&mut scenario));

            // Calculate value of shares
            let (sui_val, token_val) = tradepool::calculate_share_value<USDC>(&pool, 500);
            assert!(sui_val == 500, 0);
            assert!(token_val == 1000, 1);

            ts::return_shared(pool);
            transfer::public_transfer(receipt, ALICE);
        };

        ts::end(scenario);
    }
}
