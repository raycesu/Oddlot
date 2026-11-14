use anchor_lang::prelude::*;

use crate::constants::VAULT_SEED;
use crate::error::OddlotError;
use crate::events::Settled;
use crate::math::{mul_u64, payoff_per_token};
use crate::oracle::{check_settle_window, load_spot};
use crate::state::{Series, Vault};

#[derive(Accounts)]
pub struct Settle<'info> {
    pub payer: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut, has_one = vault)]
    pub series: Account<'info, Series>,
    /// CHECK: DemoOracle PDA or Pyth PriceUpdateV2. Checked in the handler.
    pub oracle: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<Settle>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    if ctx.accounts.series.settled {
        return err!(OddlotError::AlreadySettled);
    }
    if now < ctx.accounts.series.expiry {
        return err!(OddlotError::NotExpired);
    }
    let spot = load_spot(
        &ctx.accounts.series,
        &ctx.accounts.vault,
        &ctx.accounts.oracle.to_account_info(),
    )?;
    check_settle_window(
        spot.publish_time,
        ctx.accounts.series.expiry,
        ctx.accounts.vault.settle_window_s,
    )?;

    let payoff = payoff_per_token(
        ctx.accounts.series.kind,
        spot.usd_1e6,
        ctx.accounts.series.strike,
        ctx.accounts.series.width,
    )?;
    let oi = ctx.accounts.series.open_interest;
    let width_lock = mul_u64(oi, ctx.accounts.series.width)?;
    let payoff_lock = mul_u64(oi, payoff)?;
    let released = width_lock
        .checked_sub(payoff_lock)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    ctx.accounts.vault.total_locked = ctx
        .accounts
        .vault
        .total_locked
        .checked_sub(released)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;

    let series = &mut ctx.accounts.series;
    series.settle_price = spot.usd_1e6;
    series.payoff_per_token = payoff;
    series.settled = true;
    emit!(Settled {
        series: series.key(),
        price: spot.usd_1e6,
        payoff_per_token: payoff,
        ts: now,
    });
    Ok(())
}
