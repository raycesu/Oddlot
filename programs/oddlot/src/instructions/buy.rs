use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct Buy<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<Buy>, _qty: u64, _max_cost: u64) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
