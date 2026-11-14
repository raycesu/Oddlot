use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct Exercise<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<Exercise>) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
