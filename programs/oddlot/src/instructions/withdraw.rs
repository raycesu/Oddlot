use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::constants::VAULT_SEED;
use crate::error::OddlotError;
use crate::events::Withdrawn;
use crate::math::usdc_for_shares;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Withdraw<'info> {
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

pub fn handler(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
    let supply = ctx.accounts.lp_mint.supply;
    let balance = ctx.accounts.usdc_vault.amount;
    let payout = usdc_for_shares(shares, supply, balance)?;
    let free = balance
        .checked_sub(ctx.accounts.vault.total_locked)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    if payout > free {
        return err!(OddlotError::InsufficientFreeLiquidity);
    }

    let bump = ctx.accounts.vault.bump;
    let seeds: &[&[u8]] = &[VAULT_SEED, &[bump]];
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Burn {
                mint: ctx.accounts.lp_mint.to_account_info(),
                from: ctx.accounts.lp_shares.to_account_info(),
                authority: ctx.accounts.lp.to_account_info(),
            },
        ),
        shares,
    )?;

    if payout > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.usdc_vault.to_account_info(),
                    to: ctx.accounts.lp_usdc.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[seeds],
            ),
            payout,
        )?;
    }

    let now = Clock::get()?.unix_timestamp;
    emit!(Withdrawn {
        lp: ctx.accounts.lp.key(),
        amount: payout,
        shares,
        ts: now,
    });
    Ok(())
}
