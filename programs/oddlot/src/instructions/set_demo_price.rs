use anchor_lang::prelude::*;

use crate::constants::{DEMO_ORACLE_SEED, VAULT_SEED};
use crate::error::OddlotError;
use crate::state::{DemoOracle, Vault};

#[derive(Accounts)]
pub struct SetDemoPrice<'info> {
    pub keeper: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump, has_one = keeper)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds = [DEMO_ORACLE_SEED, vault.key().as_ref()],
        bump = demo_oracle.bump,
    )]
    pub demo_oracle: Account<'info, DemoOracle>,
}

pub fn handler(ctx: Context<SetDemoPrice>, price: u64) -> Result<()> {
    if price == 0 {
        return err!(OddlotError::InvalidOracle);
    }
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.demo_oracle.price = price;
    ctx.accounts.demo_oracle.ts = now;
    Ok(())
}
