//! Oddlot program. Account, instruction, and event shapes match `docs/master-prd.md`.

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod math;
pub mod name;
pub mod oracle;
pub mod pda;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use instructions::*;
pub use pda::{
    demo_oracle_address, option_mint_address, series_address, usdc_vault_address, vault_address,
};
pub use state::*;

// Anchor's generated `accounts` module imports these from the crate root.
pub use instructions::buy::__client_accounts_buy;
pub use instructions::create_series::__client_accounts_create_series;
pub use instructions::deposit::__client_accounts_deposit;
pub use instructions::exercise::__client_accounts_exercise;
pub use instructions::init_vault::__client_accounts_init_vault;
pub use instructions::post_quote::__client_accounts_post_quote;
pub use instructions::set_demo_price::__client_accounts_set_demo_price;
pub use instructions::set_paused::__client_accounts_set_paused;
pub use instructions::settle::__client_accounts_settle;
pub use instructions::withdraw::__client_accounts_withdraw;

declare_id!("AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n");

#[program]
pub mod oddlot {
    use super::*;

    pub fn init_vault(
        ctx: Context<InitVault>,
        keeper: Pubkey,
        max_util_bps: u16,
        quote_max_age_s: u32,
        oracle_max_age_s: u32,
        settle_window_s: u32,
        max_conf_bps: u16,
    ) -> Result<()> {
        instructions::init_vault::handler(
            ctx,
            keeper,
            max_util_bps,
            quote_max_age_s,
            oracle_max_age_s,
            settle_window_s,
            max_conf_bps,
        )
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }

    pub fn create_series(
        ctx: Context<CreateSeries>,
        underlying: [u8; 8],
        kind: u8,
        strike: u64,
        width: u64,
        expiry: i64,
        buy_cutoff_s: u32,
        oracle_kind: u8,
        pyth_feed_id: [u8; 32],
        max_open_interest: u64,
    ) -> Result<()> {
        instructions::create_series::handler(
            ctx,
            underlying,
            kind,
            strike,
            width,
            expiry,
            buy_cutoff_s,
            oracle_kind,
            pyth_feed_id,
            max_open_interest,
        )
    }

    pub fn post_quote(
        ctx: Context<PostQuote>,
        premium: u64,
        bs_premium: u64,
        crowd_premium: u64,
    ) -> Result<()> {
        instructions::post_quote::handler(ctx, premium, bs_premium, crowd_premium)
    }

    pub fn set_demo_price(ctx: Context<SetDemoPrice>, price: u64) -> Result<()> {
        instructions::set_demo_price::handler(ctx, price)
    }

    pub fn buy(ctx: Context<Buy>, qty: u64, max_cost: u64) -> Result<()> {
        instructions::buy::handler(ctx, qty, max_cost)
    }

    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        instructions::settle::handler(ctx)
    }

    pub fn exercise(ctx: Context<Exercise>) -> Result<()> {
        instructions::exercise::handler(ctx)
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        instructions::set_paused::handler(ctx, paused)
    }
}
