//! M1 acceptance tests. Run `anchor build` first so `target/deploy/oddlot.so` exists.

use anchor_lang::prelude::Pubkey;
use anchor_lang::{AccountDeserialize, Discriminator, InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use oddlot::{
    demo_oracle_address, option_mint_address, series_address, usdc_vault_address, vault_address,
    Series, Vault, ID,
};
use solana_account::Account;
use solana_clock::Clock;
use solana_instruction::Instruction;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_sdk_ids::system_program;
use solana_signer::Signer;
use solana_system_interface::instruction as system_ix;
use solana_transaction::Transaction;
use spl_associated_token_account_interface::address::get_associated_token_address_with_program_id;
use spl_associated_token_account_interface::instruction::create_associated_token_account;
use spl_token_2022_interface::extension::{BaseStateWithExtensions, StateWithExtensions};
use spl_token_2022_interface::extension::permanent_delegate::get_permanent_delegate;
use spl_token_interface::instruction::{initialize_mint2, mint_to, transfer};
use spl_token_metadata_interface::state::TokenMetadata;

const USD: u64 = 1_000_000;
const EXPIRY: i64 = 1_798_750_800;
const MAX_UTIL: u16 = 8_000;
const QUOTE_AGE: u32 = 60;
const ORACLE_AGE: u32 = 60;
const SETTLE_WINDOW: u32 = 900;
const MAX_CONF: u16 = 50;
const PROGRAM_SO: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/oddlot.so");

fn feed_id() -> [u8; 32] {
    let hex = "19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5";
    let mut out = [0u8; 32];
    for i in 0..32 {
        out[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).unwrap();
    }
    out
}

fn spy() -> [u8; 8] {
    let mut out = [0u8; 8];
    out[..3].copy_from_slice(b"SPY");
    out
}

fn set_time(svm: &mut LiteSVM, ts: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = ts;
    svm.set_sysvar(&clock);
}

fn send(
    svm: &mut LiteSVM,
    payer: &Keypair,
    ixs: &[Instruction],
    extra: &[&Keypair],
) -> Result<litesvm::types::TransactionMetadata, litesvm::types::FailedTransactionMetadata> {
    let mut signers = vec![payer];
    for signer in extra {
        if signer.pubkey() != payer.pubkey() {
            signers.push(signer);
        }
    }
    svm.expire_blockhash();
    let mut all = vec![set_compute_unit_limit(1_400_000)];
    all.extend_from_slice(ixs);
    let tx = Transaction::new(
        &signers,
        Message::new(&all, Some(&payer.pubkey())),
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx)
}

fn ok(
    svm: &mut LiteSVM,
    payer: &Keypair,
    ixs: &[Instruction],
    extra: &[&Keypair],
) {
    if let Err(err) = send(svm, payer, ixs, extra) {
        panic!("{}\n{}", err.err, err.meta.pretty_logs());
    }
}

fn set_compute_unit_limit(units: u32) -> Instruction {
    let mut data = vec![2u8];
    data.extend_from_slice(&units.to_le_bytes());
    Instruction {
        program_id: solana_sdk_ids::compute_budget::ID,
        accounts: vec![],
        data,
    }
}

fn spl_amount(svm: &LiteSVM, addr: &Pubkey) -> u64 {
    let account = svm.get_account(addr).expect("token account");
    u64::from_le_bytes(account.data[64..72].try_into().unwrap())
}

fn t22_amount(svm: &LiteSVM, addr: &Pubkey) -> u64 {
    let account = svm.get_account(addr).expect("option account");
    StateWithExtensions::<spl_token_2022_interface::state::Account>::unpack(&account.data)
        .unwrap()
        .base
        .amount
}

fn load_vault(svm: &LiteSVM) -> Vault {
    let (addr, _) = vault_address();
    let account = svm.get_account(&addr).unwrap();
    let mut data: &[u8] = &account.data;
    Vault::try_deserialize(&mut data).unwrap()
}

fn load_series(svm: &LiteSVM, addr: &Pubkey) -> Series {
    let account = svm.get_account(addr).unwrap();
    let mut data: &[u8] = &account.data;
    Series::try_deserialize(&mut data).unwrap()
}

fn assert_solvent(svm: &LiteSVM) {
    let vault = load_vault(svm);
    let cash = spl_amount(svm, &vault.usdc_vault);
    assert!(
        cash >= vault.total_locked,
        "cash {cash} < locked {}",
        vault.total_locked
    );
}

struct Env {
    svm: LiteSVM,
    admin: Keypair,
    keeper: Keypair,
    lp: Keypair,
    buyer: Keypair,
    lp_usdc: Pubkey,
    lp_shares: Pubkey,
    buyer_usdc: Pubkey,
}

fn boot(now: i64) -> Env {
    let mut svm = LiteSVM::new();
    let bytes = std::fs::read(PROGRAM_SO).expect("run anchor build before tests");
    svm.add_program(ID, &bytes).unwrap();
    set_time(&mut svm, now);

    let admin = Keypair::new();
    let keeper = Keypair::new();
    let lp = Keypair::new();
    let buyer = Keypair::new();
    for key in [&admin, &keeper, &lp, &buyer] {
        svm.airdrop(&key.pubkey(), 100_000_000_000).unwrap();
    }

    let usdc_kp = Keypair::new();
    let usdc = usdc_kp.pubkey();
    let rent = svm.minimum_balance_for_rent_exemption(82);
    ok(
        &mut svm,
        &admin,
        &[
            system_ix::create_account(
                &admin.pubkey(),
                &usdc,
                rent,
                82,
                &spl_token_interface::ID,
            ),
            initialize_mint2(&spl_token_interface::ID, &usdc, &admin.pubkey(), None, 6).unwrap(),
        ],
        &[&usdc_kp],
    );

    let lp_mint_kp = Keypair::new();
    let (vault, _) = vault_address();
    let (usdc_vault, _) = usdc_vault_address(&vault);
    let (demo, _) = demo_oracle_address(&vault);
    let lp_mint = lp_mint_kp.pubkey();
    ok(
        &mut svm,
        &admin,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::InitVault {
                admin: admin.pubkey(),
                vault,
                usdc_mint: usdc,
                usdc_vault,
                lp_mint,
                demo_oracle: demo,
                token_program: spl_token_interface::ID,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: oddlot::instruction::InitVault {
                keeper: keeper.pubkey(),
                max_util_bps: MAX_UTIL,
                quote_max_age_s: QUOTE_AGE,
                oracle_max_age_s: ORACLE_AGE,
                settle_window_s: SETTLE_WINDOW,
                max_conf_bps: MAX_CONF,
            }
            .data(),
        }],
        &[&lp_mint_kp],
    );

    let lp_usdc = ata(&lp.pubkey(), &usdc, &spl_token_interface::ID);
    let lp_shares = ata(&lp.pubkey(), &lp_mint, &spl_token_interface::ID);
    let buyer_usdc = ata(&buyer.pubkey(), &usdc, &spl_token_interface::ID);
    ok(
        &mut svm,
        &admin,
        &[
            create_associated_token_account(&admin.pubkey(), &lp.pubkey(), &usdc, &spl_token_interface::ID),
            create_associated_token_account(&admin.pubkey(), &lp.pubkey(), &lp_mint, &spl_token_interface::ID),
            create_associated_token_account(&admin.pubkey(), &buyer.pubkey(), &usdc, &spl_token_interface::ID),
            mint_to(&spl_token_interface::ID, &usdc, &lp_usdc, &admin.pubkey(), &[], 1_000_000 * USD).unwrap(),
            mint_to(&spl_token_interface::ID, &usdc, &buyer_usdc, &admin.pubkey(), &[], 1_000_000 * USD).unwrap(),
        ],
        &[],
    );

    Env {
        svm,
        admin,
        keeper,
        lp,
        buyer,
        lp_usdc,
        lp_shares,
        buyer_usdc,
    }
}

fn ata(owner: &Pubkey, mint: &Pubkey, program: &Pubkey) -> Pubkey {
    get_associated_token_address_with_program_id(owner, mint, program)
}

fn deposit(env: &mut Env, amount: u64) {
    let vault = load_vault(&env.svm);
    ok(
        &mut env.svm,
        &env.lp,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::Deposit {
                lp: env.lp.pubkey(),
                vault: vault_address().0,
                usdc_vault: vault.usdc_vault,
                lp_usdc: env.lp_usdc,
                lp_mint: vault.lp_mint,
                lp_shares: env.lp_shares,
                token_program: spl_token_interface::ID,
            }
            .to_account_metas(None),
            data: oddlot::instruction::Deposit { amount }.data(),
        }],
        &[],
    );
}

fn create_series(
    env: &mut Env,
    kind: u8,
    strike: u64,
    width: u64,
    expiry: i64,
    buy_cutoff_s: u32,
    oracle_kind: u8,
    pyth_feed_id: [u8; 32],
    max_open_interest: u64,
) -> Pubkey {
    let vault = vault_address().0;
    let (series, _) = series_address(&vault, &spy(), kind, strike, width, expiry);
    let (mint, _) = option_mint_address(&series);
    ok(
        &mut env.svm,
        &env.admin,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::CreateSeries {
                admin: env.admin.pubkey(),
                vault,
                series,
                option_mint: mint,
                token_2022_program: spl_token_2022_interface::ID,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            data: oddlot::instruction::CreateSeries {
                underlying: spy(),
                kind,
                strike,
                width,
                expiry,
                buy_cutoff_s,
                oracle_kind,
                pyth_feed_id,
                max_open_interest,
            }
            .data(),
        }],
        &[],
    );
    let buyer_opts = ata(&env.buyer.pubkey(), &mint, &spl_token_2022_interface::ID);
    ok(
        &mut env.svm,
        &env.admin,
        &[create_associated_token_account(
            &env.admin.pubkey(),
            &env.buyer.pubkey(),
            &mint,
            &spl_token_2022_interface::ID,
        )],
        &[],
    );
    let _ = buyer_opts;
    series
}

fn post_quote(env: &mut Env, series: Pubkey, premium: u64) {
    ok(
        &mut env.svm,
        &env.keeper,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::PostQuote {
                keeper: env.keeper.pubkey(),
                vault: vault_address().0,
                series,
            }
            .to_account_metas(None),
            data: oddlot::instruction::PostQuote {
                premium,
                bs_premium: premium,
                crowd_premium: 0,
            }
            .data(),
        }],
        &[],
    );
}

fn set_price(env: &mut Env, price: u64) {
    ok(
        &mut env.svm,
        &env.keeper,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::SetDemoPrice {
                keeper: env.keeper.pubkey(),
                vault: vault_address().0,
                demo_oracle: demo_oracle_address(&vault_address().0).0,
            }
            .to_account_metas(None),
            data: oddlot::instruction::SetDemoPrice { price }.data(),
        }],
        &[],
    );
}

fn buy_ix(env: &Env, series: Pubkey, oracle: Pubkey, qty: u64, max_cost: u64) -> Instruction {
    let stored = load_series(&env.svm, &series);
    let buyer_opts = ata(&env.buyer.pubkey(), &stored.option_mint, &spl_token_2022_interface::ID);
    Instruction {
        program_id: ID,
        accounts: oddlot::accounts::Buy {
            buyer: env.buyer.pubkey(),
            vault: vault_address().0,
            series,
            oracle,
            usdc_vault: load_vault(&env.svm).usdc_vault,
            buyer_usdc: env.buyer_usdc,
            option_mint: stored.option_mint,
            buyer_options: buyer_opts,
            token_program: spl_token_interface::ID,
            token_2022_program: spl_token_2022_interface::ID,
        }
        .to_account_metas(None),
        data: oddlot::instruction::Buy { qty, max_cost }.data(),
    }
}

fn buy(env: &mut Env, series: Pubkey, qty: u64, max_cost: u64) {
    let oracle = demo_oracle_address(&vault_address().0).0;
    let ix = buy_ix(env, series, oracle, qty, max_cost);
    ok(&mut env.svm, &env.buyer, &[ix], &[]);
}

fn settle(env: &mut Env, series: Pubkey, oracle: Pubkey) {
    ok(
        &mut env.svm,
        &env.admin,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::Settle {
                payer: env.admin.pubkey(),
                vault: vault_address().0,
                series,
                oracle,
            }
            .to_account_metas(None),
            data: oddlot::instruction::Settle.data(),
        }],
        &[],
    );
}

fn exercise(env: &mut Env, series: Pubkey) {
    let stored = load_series(&env.svm, &series);
    let holder_opts = ata(&env.buyer.pubkey(), &stored.option_mint, &spl_token_2022_interface::ID);
    let usdc_vault = load_vault(&env.svm).usdc_vault;
    ok(
        &mut env.svm,
        &env.keeper,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::Exercise {
                crank: env.keeper.pubkey(),
                vault: vault_address().0,
                series,
                option_mint: stored.option_mint,
                holder_options: holder_opts,
                holder: env.buyer.pubkey(),
                holder_usdc: env.buyer_usdc,
                usdc_vault,
                token_program: spl_token_interface::ID,
                token_2022_program: spl_token_2022_interface::ID,
            }
            .to_account_metas(None),
            data: oddlot::instruction::Exercise.data(),
        }],
        &[],
    );
}

fn put_series(env: &mut Env) -> Pubkey {
    create_series(env, oddlot::KIND_PUT, 780 * USD, 40 * USD, EXPIRY, 600, oddlot::ORACLE_DEMO, [0u8; 32], 500)
}

#[test]
fn deposit_shares_floor_after_premium() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 50_000 * USD);
    assert_eq!(spl_amount(&env.svm, &env.lp_shares), 50_000 * USD);
    let vault_usdc = load_vault(&env.svm).usdc_vault;
    ok(
        &mut env.svm,
        &env.lp,
        &[transfer(
            &spl_token_interface::ID,
            &env.lp_usdc,
            &vault_usdc,
            &env.lp.pubkey(),
            &[],
            5_000 * USD,
        )
        .unwrap()],
        &[],
    );
    deposit(&mut env, 10_000 * USD);
    assert_eq!(
        spl_amount(&env.svm, &env.lp_shares),
        50_000 * USD + 9_090_909_090
    );
    assert_solvent(&env.svm);
}

#[test]
fn create_series_mint_metadata_and_delegate() {
    let mut env = boot(EXPIRY - 86_400);
    let series = put_series(&mut env);
    let mint = load_series(&env.svm, &series).option_mint;
    let account = env.svm.get_account(&mint).unwrap();
    let state = StateWithExtensions::<spl_token_2022_interface::state::Mint>::unpack(&account.data).unwrap();
    assert_eq!(state.base.decimals, 0);
    assert!(state.base.mint_authority.contains(&series));
    assert_eq!(get_permanent_delegate(&state).unwrap(), series);
    let meta = state.get_variable_len_extension::<TokenMetadata>().unwrap();
    assert_eq!(meta.name, "SPY 31DEC26 P 780/740");
}

#[test]
fn buy_44_puts_locks_collateral() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 50_000 * USD);
    let series = put_series(&mut env);
    post_quote(&mut env, series, 14_100_000);
    set_price(&mut env, 780 * USD);
    let before = spl_amount(&env.svm, &env.buyer_usdc);
    buy(&mut env, series, 44, 620_400_000);
    let stored = load_series(&env.svm, &series);
    assert_eq!(before - spl_amount(&env.svm, &env.buyer_usdc), 620_400_000);
    assert_eq!(stored.open_interest, 44);
    assert_eq!(load_vault(&env.svm).total_locked, 1_760 * USD);
    let mint = stored.option_mint;
    let opts = ata(&env.buyer.pubkey(), &mint, &spl_token_2022_interface::ID);
    assert_eq!(t22_amount(&env.svm, &opts), 44);
    assert_solvent(&env.svm);
}

#[test]
fn buy_rejects_each_check() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 50_000 * USD);
    let series = put_series(&mut env);
    post_quote(&mut env, series, 14_100_000);
    set_price(&mut env, 780 * USD);
    let oracle = demo_oracle_address(&vault_address().0).0;

    ok(
        &mut env.svm,
        &env.admin,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::SetPaused {
                admin: env.admin.pubkey(),
                vault: vault_address().0,
            }
            .to_account_metas(None),
            data: oddlot::instruction::SetPaused { paused: true }.data(),
        }],
        &[],
    );
    err_has(&mut env, series, oracle, 1, u64::MAX, "Paused");
    ok(
        &mut env.svm,
        &env.admin,
        &[Instruction {
            program_id: ID,
            accounts: oddlot::accounts::SetPaused {
                admin: env.admin.pubkey(),
                vault: vault_address().0,
            }
            .to_account_metas(None),
            data: oddlot::instruction::SetPaused { paused: false }.data(),
        }],
        &[],
    );

    err_has(&mut env, series, oracle, 0, u64::MAX, "ZeroQuantity");

    set_time(&mut env.svm, EXPIRY - 600);
    err_has(&mut env, series, oracle, 1, u64::MAX, "BuyWindowClosed");
    set_time(&mut env.svm, EXPIRY - 86_400);
    post_quote(&mut env, series, 14_100_000);
    set_price(&mut env, 780 * USD);

    set_time(&mut env.svm, EXPIRY - 86_400 + 120);
    set_price(&mut env, 780 * USD);
    err_has(&mut env, series, oracle, 1, u64::MAX, "QuoteStale");
    set_time(&mut env.svm, EXPIRY - 86_400 + 240);
    post_quote(&mut env, series, 14_100_000);
    err_has(&mut env, series, oracle, 1, u64::MAX, "MarketClosed");
    set_time(&mut env.svm, EXPIRY - 86_400);
    post_quote(&mut env, series, 14_100_000);
    set_price(&mut env, 780 * USD);

    let capped = create_series(&mut env, oddlot::KIND_PUT, 760 * USD, 20 * USD, EXPIRY, 600, oddlot::ORACLE_DEMO, [0u8; 32], 10);
    post_quote(&mut env, capped, 14_100_000);
    err_has(&mut env, capped, oracle, 11, u64::MAX, "OpenInterestCap");

    err_has(&mut env, series, oracle, 44, 620_400_000 - 1, "SlippageExceeded");

    let mut thin = boot(EXPIRY - 86_400);
    deposit(&mut thin, 100 * USD);
    let thin_series = put_series(&mut thin);
    post_quote(&mut thin, thin_series, 14_100_000);
    set_price(&mut thin, 780 * USD);
    err_has(&mut thin, thin_series, demo_oracle_address(&vault_address().0).0, 44, u64::MAX, "UtilizationCap");
}

fn err_has(env: &mut Env, series: Pubkey, oracle: Pubkey, qty: u64, max_cost: u64, name: &str) {
    let ix = buy_ix(env, series, oracle, qty, max_cost);
    match send(&mut env.svm, &env.buyer, &[ix], &[]) {
        Ok(meta) => panic!("expected {name}\n{}", meta.pretty_logs()),
        Err(err) => {
            let logs = err.meta.pretty_logs();
            assert!(
                logs.contains(name),
                "expected {name} in:\n{logs}\n{}",
                err.err
            );
        }
    }
}

#[test]
fn settle_matches_payoff_table_and_releases_unused() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 100_000 * USD);
    let rows = [
        (oddlot::KIND_CALL, 20 * USD, 700 * USD, 0u64),
        (oddlot::KIND_CALL, 20 * USD, 740 * USD, 0),
        (oddlot::KIND_CALL, 20 * USD, 760 * USD, 0),
        (oddlot::KIND_CALL, 20 * USD, 780 * USD, 0),
        (oddlot::KIND_CALL, 20 * USD, 790 * USD, 10 * USD),
        (oddlot::KIND_CALL, 20 * USD, 800 * USD, 20 * USD),
        (oddlot::KIND_CALL, 20 * USD, 850 * USD, 20 * USD),
        (oddlot::KIND_PUT, 40 * USD, 700 * USD, 40 * USD),
        (oddlot::KIND_PUT, 40 * USD, 740 * USD, 40 * USD),
        (oddlot::KIND_PUT, 40 * USD, 760 * USD, 20 * USD),
        (oddlot::KIND_PUT, 40 * USD, 780 * USD, 0),
        (oddlot::KIND_PUT, 40 * USD, 790 * USD, 0),
        (oddlot::KIND_PUT, 40 * USD, 800 * USD, 0),
        (oddlot::KIND_PUT, 40 * USD, 850 * USD, 0),
    ];
    for (i, (kind, width, settle_px, payoff)) in rows.into_iter().enumerate() {
        let expiry = EXPIRY + (i as i64) * 10_000;
        set_time(&mut env.svm, expiry - 3_600);
        let strike = if kind == oddlot::KIND_PUT { 780 * USD } else { 780 * USD };
        let series = create_series(&mut env, kind, strike, width, expiry, 30, oddlot::ORACLE_DEMO, [0u8; 32], 10);
        post_quote(&mut env, series, USD);
        set_price(&mut env, 780 * USD);
        buy(&mut env, series, 1, u64::MAX);
        let before = load_vault(&env.svm).total_locked;
        set_time(&mut env.svm, expiry + 30);
        set_price(&mut env, settle_px);
        settle(&mut env, series, demo_oracle_address(&vault_address().0).0);
        let stored = load_series(&env.svm, &series);
        assert_eq!(stored.payoff_per_token, payoff, "row {i}");
        assert_eq!(stored.settle_price, settle_px);
        assert_eq!(before - load_vault(&env.svm).total_locked, width - payoff);
        exercise(&mut env, series);
        assert_solvent(&env.svm);
    }
}

#[test]
fn exercise_pays_full_put_and_second_is_noop() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 50_000 * USD);
    let series = put_series(&mut env);
    post_quote(&mut env, series, 14_100_000);
    set_price(&mut env, 780 * USD);
    buy(&mut env, series, 44, u64::MAX);
    set_time(&mut env.svm, EXPIRY + 60);
    set_price(&mut env, 717_600_000);
    settle(&mut env, series, demo_oracle_address(&vault_address().0).0);
    assert_eq!(load_series(&env.svm, &series).payoff_per_token, 40 * USD);
    let before = spl_amount(&env.svm, &env.buyer_usdc);
    exercise(&mut env, series);
    assert_eq!(spl_amount(&env.svm, &env.buyer_usdc) - before, 1_760 * USD);
    assert_eq!(load_vault(&env.svm).total_locked, 0);
    assert_eq!(load_series(&env.svm, &series).open_interest, 0);
    exercise(&mut env, series);
    assert_eq!(spl_amount(&env.svm, &env.buyer_usdc) - before, 1_760 * USD);
    assert_eq!(load_vault(&env.svm).total_locked, 0);
}

#[test]
fn withdraw_beyond_free_liquidity_fails() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 50_000 * USD);
    let series = put_series(&mut env);
    post_quote(&mut env, series, 14_100_000);
    set_price(&mut env, 780 * USD);
    buy(&mut env, series, 44, u64::MAX);
    let shares = spl_amount(&env.svm, &env.lp_shares);
    let vault = load_vault(&env.svm);
    let ix = Instruction {
        program_id: ID,
        accounts: oddlot::accounts::Withdraw {
            lp: env.lp.pubkey(),
            vault: vault_address().0,
            usdc_vault: vault.usdc_vault,
            lp_usdc: env.lp_usdc,
            lp_mint: vault.lp_mint,
            lp_shares: env.lp_shares,
            token_program: spl_token_interface::ID,
        }
        .to_account_metas(None),
        data: oddlot::instruction::Withdraw { shares }.data(),
    };
    match send(&mut env.svm, &env.lp, &[ix], &[]) {
        Ok(meta) => panic!("expected InsufficientFreeLiquidity\n{}", meta.pretty_logs()),
        Err(err) => assert!(err.meta.pretty_logs().contains("InsufficientFreeLiquidity")),
    }
    assert_eq!(load_vault(&env.svm).total_locked, 1_760 * USD);
}

#[test]
fn invariant_holds_across_500_random_ops() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 80_000 * USD);
    let series = create_series(&mut env, oddlot::KIND_CALL, 780 * USD, USD, EXPIRY, 600, oddlot::ORACLE_DEMO, [0u8; 32], 5_000);
    post_quote(&mut env, series, USD);
    set_price(&mut env, 780 * USD);
    let mut rng = 0x0dd1_07u64;
    let mut buys = 0u32;
    for _ in 0..500 {
        let roll = {
            rng ^= rng << 13;
            rng ^= rng >> 7;
            rng ^= rng << 17;
            rng % 5
        };
        match roll {
            0 => deposit(&mut env, USD),
            1 => {
                let have = spl_amount(&env.svm, &env.lp_shares);
                if have > USD {
                    let vault = load_vault(&env.svm);
                    let ix = Instruction {
                        program_id: ID,
                        accounts: oddlot::accounts::Withdraw {
                            lp: env.lp.pubkey(),
                            vault: vault_address().0,
                            usdc_vault: vault.usdc_vault,
                            lp_usdc: env.lp_usdc,
                            lp_mint: vault.lp_mint,
                            lp_shares: env.lp_shares,
                            token_program: spl_token_interface::ID,
                        }
                        .to_account_metas(None),
                        data: oddlot::instruction::Withdraw { shares: USD }.data(),
                    };
                    let _ = send(&mut env.svm, &env.lp, &[ix], &[]);
                }
            }
            2 => {
                let ix = buy_ix(&env, series, demo_oracle_address(&vault_address().0).0, 1, u64::MAX);
                if send(&mut env.svm, &env.buyer, &[ix], &[]).is_ok() {
                    buys += 1;
                }
            }
            3 => post_quote(&mut env, series, USD + (rng % 5) * 10_000),
            _ => set_price(&mut env, 780 * USD),
        }
        assert_solvent(&env.svm);
    }
    assert!(buys > 0, "expected some buys to succeed");
}

#[test]
fn security_keeper_feed_and_oracle_kind() {
    let mut env = boot(EXPIRY - 86_400);
    deposit(&mut env, 50_000 * USD);
    let demo = put_series(&mut env);
    let ix = Instruction {
        program_id: ID,
        accounts: oddlot::accounts::PostQuote {
            keeper: env.lp.pubkey(),
            vault: vault_address().0,
            series: demo,
        }
        .to_account_metas(None),
        data: oddlot::instruction::PostQuote {
            premium: USD,
            bs_premium: USD,
            crowd_premium: 0,
        }
        .data(),
    };
    assert!(send(&mut env.svm, &env.lp, &[ix], &[]).is_err());

    let pyth_series = create_series(
        &mut env,
        oddlot::KIND_PUT,
        800 * USD,
        20 * USD,
        EXPIRY,
        600,
        oddlot::ORACLE_PYTH,
        feed_id(),
        100,
    );
    post_quote(&mut env, pyth_series, USD);
    post_quote(&mut env, demo, USD);
    set_price(&mut env, 780 * USD);
    let now = EXPIRY - 86_400;
    let pyth = write_pyth(&mut env.svm, feed_id(), 78_000, -2, 10, now);
    let wrong = write_pyth(&mut env.svm, [9u8; 32], 78_000, -2, 10, now);
    let wide = write_pyth(&mut env.svm, feed_id(), 78_000, -2, 10_000, now);
    err_has(&mut env, pyth_series, wrong, 1, u64::MAX, "InvalidOracle");
    err_has(&mut env, pyth_series, demo_oracle_address(&vault_address().0).0, 1, u64::MAX, "InvalidOracle");
    err_has(&mut env, demo, pyth, 1, u64::MAX, "InvalidOracle");
    err_has(&mut env, pyth_series, wide, 1, u64::MAX, "OracleConfidence");
    let ix = buy_ix(&env, pyth_series, pyth, 1, u64::MAX);
    ok(&mut env.svm, &env.buyer, &[ix], &[]);
    assert_eq!(load_series(&env.svm, &pyth_series).open_interest, 1);
}

fn write_pyth(svm: &mut LiteSVM, feed: [u8; 32], price: i64, expo: i32, conf: u64, ts: i64) -> Pubkey {
    use anchor_lang::AnchorSerialize;
    use pyth_solana_receiver_sdk::price_update::{PriceFeedMessage, PriceUpdateV2, VerificationLevel};

    let update = PriceUpdateV2 {
        write_authority: Pubkey::default(),
        verification_level: VerificationLevel::Full,
        price_message: PriceFeedMessage {
            feed_id: feed,
            price,
            conf,
            exponent: expo,
            publish_time: ts,
            prev_publish_time: ts - 1,
            ema_price: price,
            ema_conf: conf,
        },
        posted_slot: 1,
    };
    let mut data = Vec::new();
    data.extend_from_slice(PriceUpdateV2::DISCRIMINATOR);
    update.serialize(&mut data).unwrap();
    let addr = Keypair::new().pubkey();
    let account = Account {
        lamports: svm.minimum_balance_for_rent_exemption(data.len()),
        data,
        owner: oddlot::oracle::PYTH_RECEIVER_ID,
        executable: false,
        rent_epoch: 0,
    };
    svm.set_account(addr, account).unwrap();
    addr
}
