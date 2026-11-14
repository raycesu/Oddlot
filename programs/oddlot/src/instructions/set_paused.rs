use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct SetPaused<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<SetPaused>, _paused: bool) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
