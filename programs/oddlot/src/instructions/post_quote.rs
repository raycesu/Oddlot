use anchor_lang::prelude::*;

use crate::constants::VAULT_SEED;
use crate::error::OddlotError;
use crate::events::Quoted;
use crate::state::{Series, Vault};

#[derive(Accounts)]
pub struct PostQuote<'info> {
    pub keeper: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump, has_one = keeper)]
    pub vault: Account<'info, Vault>,
    #[account(mut, has_one = vault)]
    pub series: Account<'info, Series>,
}

pub fn handler(
    ctx: Context<PostQuote>,
    premium: u64,
    bs_premium: u64,
    crowd_premium: u64,
) -> Result<()> {
    if ctx.accounts.series.settled {
        return err!(OddlotError::AlreadySettled);
    }
    if premium == 0 {
        return err!(OddlotError::ZeroQuantity);
    }
    let now = Clock::get()?.unix_timestamp;
    let series = &mut ctx.accounts.series;
    series.premium = premium;
    series.bs_premium = bs_premium;
    series.crowd_premium = crowd_premium;
    series.quote_ts = now;
    emit!(Quoted {
        series: series.key(),
        premium,
        bs_premium,
        crowd_premium,
        ts: now,
    });
    Ok(())
}
