#[test_only]
module tradepool::tradepool_updated_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use std::string;
    use tradepool::tradepool::{Self, Pool, PoolRegistry, AdminCap, LPToken};

    // Mock token for testing
    public struct USDC has drop {}

    // Test addresses
    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA;
    const BOB: address = @0xB;
    const CHARLIE: address = @0xC;

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
    fun test_create_pool_with_default_admin() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_momentum_pool_id = object::id_from_address(@0x1234);

            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC Pool",
                dummy_momentum_pool_id,
                option::none(), // No admin specified, creator becomes admin
                ts::ctx(&mut scenario)
            );

            assert!(tradepool::get_pool_count(&registry) == 1, 0);
            assert!(tradepool::pool_exists(&registry, string::utf8(b"SUI-USDC Pool")), 1);

            ts::return_shared(registry);
        };

        // Verify admin is the creator
        ts::next_tx(&mut scenario, ADMIN);
        {
            let pool = ts::take_shared<Pool<USDC>>(&scenario);
            assert!(tradepool::get_pool_admin(&pool) == ADMIN, 2);
            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_create_pool_with_custom_admin() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_momentum_pool_id = object::id_from_address(@0x1234);

            // Alice creates pool but sets Bob as admin
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC Pool",
                dummy_momentum_pool_id,
                option::some(BOB), // Bob is the admin
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // Verify admin is Bob, not Alice
        ts::next_tx(&mut scenario, BOB);
        {
            let pool = ts::take_shared<Pool<USDC>>(&scenario);
            assert!(tradepool::get_pool_admin(&pool) == BOB, 0);
            ts::return_shared(pool);
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
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Alice deposits SUI only
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));

            let lp_coin = tradepool::deposit<USDC>(
                &mut pool,
                sui_payment,
                ts::ctx(&mut scenario)
            );

            // Verify pool state
            assert!(tradepool::get_pool_sui_balance(&pool) == 1000, 0);
            assert!(tradepool::get_pool_token_balance(&pool) == 0, 1); // No TOKEN yet
            assert!(tradepool::get_pool_total_shares(&pool) == 1000, 2);

            // Verify LP coin value
            assert!(coin::value(&lp_coin) == 1000, 3);

            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, ALICE);
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
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Alice first deposit: 1000 SUI
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_coin = tradepool::deposit<USDC>(&mut pool, sui_payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, ALICE);
        };

        // Bob deposits: 2000 SUI (2x Alice's amount)
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(2000, ts::ctx(&mut scenario));
            let lp_coin = tradepool::deposit<USDC>(&mut pool, sui_payment, ts::ctx(&mut scenario));

            // Pool should have 3000 SUI, 3000 shares
            assert!(tradepool::get_pool_sui_balance(&pool) == 3000, 0);
            assert!(tradepool::get_pool_total_shares(&pool) == 3000, 1);

            // Bob should get 2000 shares (proportional)
            assert!(coin::value(&lp_coin) == 2000, 2);

            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, BOB);
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
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Alice deposits
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_coin = tradepool::deposit<USDC>(&mut pool, sui_payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, ALICE);
        };

        // Alice withdraws
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let lp_coin = ts::take_from_sender<Coin<LPToken<USDC>>>(&scenario);

            let (sui_coin, usdc_coin) = tradepool::withdraw<USDC>(&mut pool, lp_coin, ts::ctx(&mut scenario));

            // Verify Alice got her SUI back
            assert!(coin::value(&sui_coin) == 1000, 0);
            assert!(coin::value(&usdc_coin) == 0, 1); // No USDC in pool

            // Pool should be empty again
            assert!(tradepool::get_pool_sui_balance(&pool) == 0, 2);
            assert!(tradepool::get_pool_token_balance(&pool) == 0, 3);
            assert!(tradepool::get_pool_total_shares(&pool) == 0, 4);

            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, ALICE);
            coin::destroy_zero(usdc_coin);
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
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Alice deposits 1000 SUI
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_coin = tradepool::deposit<USDC>(&mut pool, sui_payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, ALICE);
        };

        // Alice splits and withdraws half
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let mut lp_coin = ts::take_from_sender<Coin<LPToken<USDC>>>(&scenario);

            // Split coin: keep 500, withdraw 500
            let half_lp = coin::split(&mut lp_coin, 500, ts::ctx(&mut scenario));
            let (sui_coin, usdc_coin) = tradepool::withdraw<USDC>(&mut pool, half_lp, ts::ctx(&mut scenario));

            // Verify Alice got half back
            assert!(coin::value(&sui_coin) == 500, 0);
            assert!(coin::value(&usdc_coin) == 0, 1);

            // Pool should have half remaining
            assert!(tradepool::get_pool_sui_balance(&pool) == 500, 2);
            assert!(tradepool::get_pool_total_shares(&pool) == 500, 3);

            // LP coin should have 500 shares left
            assert!(coin::value(&lp_coin) == 500, 4);

            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, ALICE);
            transfer::public_transfer(sui_coin, ALICE);
            coin::destroy_zero(usdc_coin);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_merge_lp_coins() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        // Create pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Alice makes two deposits
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);

            // First deposit
            let sui1 = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            let lp_coin1 = tradepool::deposit<USDC>(&mut pool, sui1, ts::ctx(&mut scenario));

            // Second deposit
            let sui2 = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            let lp_coin2 = tradepool::deposit<USDC>(&mut pool, sui2, ts::ctx(&mut scenario));

            // Merge LP coins
            let mut merged = lp_coin1;
            coin::join(&mut merged, lp_coin2);

            // Merged coin should have 1000 shares
            assert!(coin::value(&merged) == 1000, 0);

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
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(0, ts::ctx(&mut scenario));
            let lp_coin = tradepool::deposit<USDC>(&mut pool, sui_payment, ts::ctx(&mut scenario));

            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_create_duplicate_pool_name() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);

            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"Pool1",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );

            // Same name should fail
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"Pool1",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );

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
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Deposit
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool<USDC>>(&scenario);
            let sui_payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_coin = tradepool::deposit<USDC>(&mut pool, sui_payment, ts::ctx(&mut scenario));

            // Calculate value of 500 shares
            let (sui_val, token_val) = tradepool::calculate_share_value<USDC>(&pool, 500);
            assert!(sui_val == 500, 0);
            assert!(token_val == 0, 1); // No tokens yet

            ts::return_shared(pool);
            transfer::public_transfer(lp_coin, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_pools_different_names() {
        let mut scenario = ts::begin(ADMIN);
        init_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);

            // Create multiple pools with different names
            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"Pool1",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );

            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"Pool2",
                dummy_pool_id,
                option::none(),
                ts::ctx(&mut scenario)
            );

            assert!(tradepool::get_pool_count(&registry) == 2, 0);
            assert!(tradepool::pool_exists(&registry, string::utf8(b"Pool1")), 1);
            assert!(tradepool::pool_exists(&registry, string::utf8(b"Pool2")), 2);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_pool_admin_can_be_different_from_creator() {
        let mut scenario = ts::begin(ALICE);
        init_for_testing(&mut scenario);

        // Alice creates pool with Charlie as admin
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut registry = ts::take_shared<PoolRegistry>(&scenario);
            let dummy_pool_id = object::id_from_address(@0x1234);

            tradepool::create_pool_public<USDC>(
                &mut registry,
                b"SUI-USDC",
                dummy_pool_id,
                option::some(CHARLIE), // Charlie is admin
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // Verify Charlie is the admin
        ts::next_tx(&mut scenario, CHARLIE);
        {
            let pool = ts::take_shared<Pool<USDC>>(&scenario);
            assert!(tradepool::get_pool_admin(&pool) == CHARLIE, 0);
            ts::return_shared(pool);
        };

        ts::end(scenario);
    }
}
