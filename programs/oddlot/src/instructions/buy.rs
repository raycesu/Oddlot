use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::token_2022::{self, Token2022};
use anchor_spl::token_interface::{Mint, TokenAccount as OptionAccount};

use crate::constants::*;
use crate::error::OddlotError;
use crate::events::Bought;
use crate::math::{check_utilization, mul_u64};
use crate::oracle::{check_buy_age, load_spot};
use crate::state::{Series, Vault};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut, has_one = vault)]
    pub series: Account<'info, Series>,
    /// CHECK: DemoOracle PDA or Pyth PriceUpdateV2. Checked in the handler.
    pub oracle: UncheckedAccount<'info>,
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
        token::authority = buyer,
        token::token_program = token_program,
    )]
    pub buyer_usdc: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = series.option_mint @ OddlotError::WrongMint,
    )]
    pub option_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = option_mint,
        token::authority = buyer,
        token::token_program = token_2022_program,
    )]
    pub buyer_options: InterfaceAccount<'info, OptionAccount>,
    pub token_program: Program<'info, Token>,
    pub token_2022_program: Program<'info, Token2022>,
}

pub fn handler(ctx: Context<Buy>, qty: u64, max_cost: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    if ctx.accounts.vault.paused {
        return err!(OddlotError::Paused);
    }
    if qty == 0 {
        return err!(OddlotError::ZeroQuantity);
    }
    let series = &ctx.accounts.series;
    let cutoff = series
        .expiry
        .checked_sub(series.buy_cutoff_s as i64)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    if now >= cutoff {
        return err!(OddlotError::BuyWindowClosed);
    }
    if series.quote_ts == 0 || now < series.quote_ts {
        return err!(OddlotError::QuoteStale);
    }
    if now - series.quote_ts > ctx.accounts.vault.quote_max_age_s as i64 {
        return err!(OddlotError::QuoteStale);
    }

    let spot = load_spot(series, &ctx.accounts.vault, &ctx.accounts.oracle.to_account_info())?;
    check_buy_age(
        spot.publish_time,
        now,
        ctx.accounts.vault.oracle_max_age_s,
    )?;

    let new_oi = series
        .open_interest
        .checked_add(qty)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    if new_oi > series.max_open_interest {
        return err!(OddlotError::OpenInterestCap);
    }
    let cost = mul_u64(qty, series.premium)?;
    if cost > max_cost {
        return err!(OddlotError::SlippageExceeded);
    }
    let lock = mul_u64(qty, series.width)?;
    let new_locked = ctx
        .accounts
        .vault
        .total_locked
        .checked_add(lock)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    let new_balance = ctx
        .accounts
        .usdc_vault
        .amount
        .checked_add(cost)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    check_utilization(
        new_locked,
        new_balance,
        ctx.accounts.vault.max_util_bps,
    )?;

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.buyer_usdc.to_account_info(),
                to: ctx.accounts.usdc_vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        cost,
    )?;

    let strike_le = series.strike.to_le_bytes();
    let width_le = series.width.to_le_bytes();
    let expiry_le = series.expiry.to_le_bytes();
    let bump = [series.bump];
    let kind = [series.kind];
    let vault_key = series.vault;
    let underlying = series.underlying;
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
    token_2022::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_2022_program.key(),
            token_2022::MintTo {
                mint: ctx.accounts.option_mint.to_account_info(),
                to: ctx.accounts.buyer_options.to_account_info(),
                authority: ctx.accounts.series.to_account_info(),
            },
            &[seeds],
        ),
        qty,
    )?;

    let series = &mut ctx.accounts.series;
    series.open_interest = new_oi;
    ctx.accounts.vault.total_locked = new_locked;
    emit!(Bought {
        buyer: ctx.accounts.buyer.key(),
        series: series.key(),
        qty,
        cost,
        spot: spot.usd_1e6,
        ts: now,
    });
    Ok(())
}
