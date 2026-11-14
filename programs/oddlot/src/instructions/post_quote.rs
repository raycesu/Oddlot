use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct PostQuote<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<PostQuote>,
    _premium: u64,
    _bs_premium: u64,
    _crowd_premium: u64,
) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
