use anchor_lang::prelude::*;

use crate::error::OddlotError;

#[derive(Accounts)]
pub struct SetDemoPrice<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<SetDemoPrice>, _price: u64) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
