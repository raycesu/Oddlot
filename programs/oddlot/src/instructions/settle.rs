use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct Settle<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<Settle>) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
