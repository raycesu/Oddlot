use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::VAULT_SEED;
use crate::events::Deposited;
use crate::math::shares_for_deposit;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub lp: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        address = vault.usdc_vault,
        token::mint = vault.usdc_mint,
        token::authority = vault,
        token::token_program = token_program,
    )]
    pub usdc_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = vault.usdc_mint,
        token::authority = lp,
        token::token_program = token_program,
    )]
    pub lp_usdc: Account<'info, TokenAccount>,
    #[account(mut, address = vault.lp_mint)]
    pub lp_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = vault.lp_mint,
        token::authority = lp,
        token::token_program = token_program,
    )]
    pub lp_shares: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let supply = ctx.accounts.lp_mint.supply;
    let balance = ctx.accounts.usdc_vault.amount;
    let shares = shares_for_deposit(amount, supply, balance)?;

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.lp_usdc.to_account_info(),
                to: ctx.accounts.usdc_vault.to_account_info(),
                authority: ctx.accounts.lp.to_account_info(),
            },
        ),
        amount,
    )?;

    let bump = ctx.accounts.vault.bump;
    let seeds: &[&[u8]] = &[VAULT_SEED, &[bump]];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            token::MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.lp_shares.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[seeds],
        ),
        shares,
    )?;

    let now = Clock::get()?.unix_timestamp;
    emit!(Deposited {
        lp: ctx.accounts.lp.key(),
        amount,
        shares,
        ts: now,
    });
    Ok(())
}
