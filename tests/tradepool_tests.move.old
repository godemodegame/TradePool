#[test_only]
module tradepool::tradepool_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use tradepool::tradepool::{Self, Pool, AdminCap, TRADEPOOL};

    // Test addresses
    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA;
    const BOB: address = @0xB;
    const CAROL: address = @0xC;

    // Test amounts
    const INITIAL_SUI: u64 = 10_000_000_000; // 10 SUI

    // ====== Test Helpers ======

    fun init_pool_for_testing(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            tradepool::init_for_testing(ts::ctx(scenario));
        };
    }

    // ====== Tests ======

    #[test]
    fun test_init() {
        let mut scenario = ts::begin(ADMIN);

        // Initialize the module
        init_pool_for_testing(&mut scenario);

        // Check that Pool was created and shared
        ts::next_tx(&mut scenario, ADMIN);
        {
            let pool = ts::take_shared<Pool>(&scenario);

            // Verify pool is empty
            assert!(tradepool::get_pool_sui_balance(&pool) == 0, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 0, 1);

            ts::return_shared(pool);
        };

        // Check that AdminCap was created and transferred to admin
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_first_deposit() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Alice makes first deposit
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));

            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));

            // Verify pool state
            assert!(tradepool::get_pool_sui_balance(&pool) == 1000, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 1000, 1);

            // Verify Alice received LP tokens (1:1 ratio for first deposit)
            assert!(coin::value(&lp_tokens) == 1000, 2);

            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_second_deposit_same_amount() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Alice makes first deposit: 1000 SUI
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, ALICE);
        };

        // Bob makes second deposit: 1000 SUI
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));

            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));

            // Verify pool state: 2000 SUI, 2000 LP
            assert!(tradepool::get_pool_sui_balance(&pool) == 2000, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 2000, 1);

            // Verify Bob received 1000 LP tokens (same as Alice)
            assert!(coin::value(&lp_tokens) == 1000, 2);

            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, BOB);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_proportional_deposit() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Alice deposits 1000 SUI
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, ALICE);
        };

        // Bob deposits 500 SUI (half of Alice's amount)
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));

            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));

            // Verify pool state: 1500 SUI, 1500 LP
            assert!(tradepool::get_pool_sui_balance(&pool) == 1500, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 1500, 1);

            // Verify Bob received 500 LP tokens (proportional)
            assert!(coin::value(&lp_tokens) == 500, 2);

            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, BOB);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_full_withdrawal() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Alice deposits 1000 SUI
        let lp_tokens;
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // Alice withdraws all LP tokens
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);

            let sui_coin = tradepool::withdraw(&mut pool, lp_tokens, ts::ctx(&mut scenario));

            // Verify pool is empty
            assert!(tradepool::get_pool_sui_balance(&pool) == 0, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 0, 1);

            // Verify Alice received 1000 SUI back
            assert!(coin::value(&sui_coin) == 1000, 2);

            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_partial_withdrawal() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Alice deposits 1000 SUI, gets 1000 LP
        let mut alice_lp;
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            alice_lp = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // Bob deposits 500 SUI, gets 500 LP
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            let bob_lp = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(bob_lp, BOB);
        };

        // Pool now has: 1500 SUI, 1500 LP

        // Alice withdraws 500 LP (half of her holdings)
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);

            // Split 500 LP from Alice's 1000 LP
            let lp_to_withdraw = coin::split(&mut alice_lp, 500, ts::ctx(&mut scenario));

            let sui_coin = tradepool::withdraw(&mut pool, lp_to_withdraw, ts::ctx(&mut scenario));

            // Verify pool state: 1000 SUI, 1000 LP remaining
            assert!(tradepool::get_pool_sui_balance(&pool) == 1000, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 1000, 1);

            // Verify Alice received 500 SUI
            assert!(coin::value(&sui_coin) == 500, 2);

            ts::return_shared(pool);
            transfer::public_transfer(alice_lp, ALICE);
            transfer::public_transfer(sui_coin, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_users_scenario() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Alice deposits 1000 SUI
        let mut alice_lp;
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            alice_lp = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // Bob deposits 500 SUI
        let bob_lp;
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            bob_lp = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // Pool: 1500 SUI, 1500 LP (Alice: 1000 LP, Bob: 500 LP)

        // Alice withdraws 500 LP
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let lp_to_withdraw = coin::split(&mut alice_lp, 500, ts::ctx(&mut scenario));
            let sui_coin = tradepool::withdraw(&mut pool, lp_to_withdraw, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, ALICE);
        };

        // Pool: 1000 SUI, 1000 LP (Alice: 500 LP, Bob: 500 LP)

        // Bob withdraws all 500 LP
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let sui_coin = tradepool::withdraw(&mut pool, bob_lp, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, BOB);
        };

        // Pool: 500 SUI, 500 LP (Alice: 500 LP)

        // Alice withdraws remaining 500 LP
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let sui_coin = tradepool::withdraw(&mut pool, alice_lp, ts::ctx(&mut scenario));

            // Pool should be empty
            assert!(tradepool::get_pool_sui_balance(&pool) == 0, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 0, 1);

            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_deposit_after_empty() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Alice deposits and withdraws
        let lp_tokens;
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let sui_coin = tradepool::withdraw(&mut pool, lp_tokens, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, ALICE);
        };

        // Bob deposits into empty pool (should work like first deposit)
        ts::next_tx(&mut scenario, BOB);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(2000, ts::ctx(&mut scenario));

            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));

            // Should get 1:1 ratio again
            assert!(tradepool::get_pool_sui_balance(&pool) == 2000, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 2000, 1);
            assert!(coin::value(&lp_tokens) == 2000, 2);

            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, BOB);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_view_functions() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // Deposit some SUI
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));

            // Test view functions
            assert!(tradepool::get_pool_sui_balance(&pool) == 1000, 0);
            assert!(tradepool::get_pool_lp_supply(&pool) == 1000, 1);

            // Test calculate_lp_value
            assert!(tradepool::calculate_lp_value(&pool, 500) == 500, 2);
            assert!(tradepool::calculate_lp_value(&pool, 1000) == 1000, 3);

            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, ALICE);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_zero_deposit_fails() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(0, ts::ctx(&mut scenario));

            // This should fail before returning
            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));

            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, ALICE); // Never reached
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_zero_withdrawal_fails() {
        let mut scenario = ts::begin(ADMIN);
        init_pool_for_testing(&mut scenario);

        // First deposit some SUI
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            let lp_tokens = tradepool::deposit(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
            transfer::public_transfer(lp_tokens, ALICE);
        };

        // Try to withdraw zero LP tokens
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut pool = ts::take_shared<Pool>(&scenario);
            let lp_tokens = coin::mint_for_testing<TRADEPOOL>(0, ts::ctx(&mut scenario));

            // This should fail before returning
            let sui_coin = tradepool::withdraw(&mut pool, lp_tokens, ts::ctx(&mut scenario));

            ts::return_shared(pool);
            transfer::public_transfer(sui_coin, ALICE); // Never reached
        };

        ts::end(scenario);
    }
}
