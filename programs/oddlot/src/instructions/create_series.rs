use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct CreateSeries<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<CreateSeries>,
    _underlying: [u8; 8],
    _kind: u8,
    _strike: u64,
    _width: u64,
    _expiry: i64,
    _buy_cutoff_s: u32,
    _oracle_kind: u8,
    _pyth_feed_id: [u8; 32],
    _max_open_interest: u64,
) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
