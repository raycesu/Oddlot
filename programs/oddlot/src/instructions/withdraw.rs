use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<Withdraw>, _shares: u64) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
