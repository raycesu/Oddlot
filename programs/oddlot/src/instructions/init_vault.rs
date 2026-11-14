use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::error::OddlotError;
use crate::state::{DemoOracle, Vault};

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [USDC_VAULT_SEED, vault.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = vault,
        token::token_program = token_program,
    )]
    pub usdc_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = admin,
        mint::decimals = 6,
        mint::authority = vault,
        mint::token_program = token_program,
    )]
    pub lp_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        space = 8 + DemoOracle::INIT_SPACE,
        seeds = [DEMO_ORACLE_SEED, vault.key().as_ref()],
        bump,
    )]
    pub demo_oracle: Account<'info, DemoOracle>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitVault>,
    keeper: Pubkey,
    max_util_bps: u16,
    quote_max_age_s: u32,
    oracle_max_age_s: u32,
    settle_window_s: u32,
    max_conf_bps: u16,
) -> Result<()> {
    if keeper == Pubkey::default()
        || max_util_bps > 10_000
        || quote_max_age_s == 0
        || oracle_max_age_s == 0
        || settle_window_s == 0
        || ctx.accounts.usdc_mint.decimals != 6
    {
        return err!(OddlotError::InvalidSeriesParams);
    }

    let vault = &mut ctx.accounts.vault;
    vault.admin = ctx.accounts.admin.key();
    vault.keeper = keeper;
    vault.usdc_mint = ctx.accounts.usdc_mint.key();
    vault.usdc_vault = ctx.accounts.usdc_vault.key();
    vault.lp_mint = ctx.accounts.lp_mint.key();
    vault.total_locked = 0;
    vault.max_util_bps = max_util_bps;
    vault.quote_max_age_s = quote_max_age_s;
    vault.oracle_max_age_s = oracle_max_age_s;
    vault.settle_window_s = settle_window_s;
    vault.max_conf_bps = max_conf_bps;
    vault.paused = false;
    vault.bump = ctx.bumps.vault;

    let demo = &mut ctx.accounts.demo_oracle;
    demo.price = 0;
    demo.ts = 0;
    demo.bump = ctx.bumps.demo_oracle;
    Ok(())
}
