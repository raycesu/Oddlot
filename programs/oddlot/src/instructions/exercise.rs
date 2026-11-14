use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::token_2022::{self, Burn, Token2022};
use anchor_spl::token_interface::{Mint, TokenAccount as OptionAccount};

use crate::constants::*;
use crate::error::OddlotError;
use crate::events::Exercised;
use crate::math::mul_u64;
use crate::state::{Series, Vault};

#[derive(Accounts)]
pub struct Exercise<'info> {
    pub crank: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut, has_one = vault)]
    pub series: Account<'info, Series>,
    #[account(
        mut,
        address = series.option_mint @ OddlotError::WrongMint,
    )]
    pub option_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = option_mint,
        token::token_program = token_2022_program,
    )]
    pub holder_options: InterfaceAccount<'info, OptionAccount>,
    /// CHECK: Must own both the option tokens and the USDC destination.
    pub holder: UncheckedAccount<'info>,
    #[account(
        mut,
        token::mint = vault.usdc_mint,
        token::authority = holder,
        token::token_program = token_program,
    )]
    pub holder_usdc: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = vault.usdc_vault,
        token::mint = vault.usdc_mint,
        token::authority = vault,
        token::token_program = token_program,
    )]
    pub usdc_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub token_2022_program: Program<'info, Token2022>,
}

pub fn handler(ctx: Context<Exercise>) -> Result<()> {
    if !ctx.accounts.series.settled {
        return err!(OddlotError::NotSettled);
    }
    if ctx.accounts.holder_options.owner != ctx.accounts.holder.key() {
        return err!(OddlotError::Unauthorized);
    }
    let qty = ctx.accounts.holder_options.amount;
    if qty == 0 {
        return Ok(());
    }

    let strike_le = ctx.accounts.series.strike.to_le_bytes();
    let width_le = ctx.accounts.series.width.to_le_bytes();
    let expiry_le = ctx.accounts.series.expiry.to_le_bytes();
    let bump = [ctx.accounts.series.bump];
    let kind = [ctx.accounts.series.kind];
    let vault_key = ctx.accounts.series.vault;
    let underlying = ctx.accounts.series.underlying;
    let seeds: &[&[u8]] = &[
        SERIES_SEED,
        vault_key.as_ref(),
        underlying.as_ref(),
        &kind,
        &strike_le,
        &width_le,
        &expiry_le,
        &bump,
    ];

    token_2022::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_2022_program.key(),
            Burn {
                mint: ctx.accounts.option_mint.to_account_info(),
                from: ctx.accounts.holder_options.to_account_info(),
                authority: ctx.accounts.series.to_account_info(),
            },
            &[seeds],
        ),
        qty,
    )?;

    let paid = mul_u64(qty, ctx.accounts.series.payoff_per_token)?;
    if paid > 0 {
        let vault_bump = ctx.accounts.vault.bump;
        let vault_seeds: &[&[u8]] = &[VAULT_SEED, &[vault_bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.usdc_vault.to_account_info(),
                    to: ctx.accounts.holder_usdc.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[vault_seeds],
            ),
            paid,
        )?;
    }

    ctx.accounts.series.open_interest = ctx
        .accounts
        .series
        .open_interest
        .checked_sub(qty)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    ctx.accounts.vault.total_locked = ctx
        .accounts
        .vault
        .total_locked
        .checked_sub(paid)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;

    let now = Clock::get()?.unix_timestamp;
    emit!(Exercised {
        holder: ctx.accounts.holder.key(),
        series: ctx.accounts.series.key(),
        qty,
        paid,
        ts: now,
    });
    Ok(())
}
