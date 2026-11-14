use anchor_lang::prelude::*;

use crate::constants::VAULT_SEED;
use crate::state::Vault;

#[derive(Accounts)]
pub struct SetPaused<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, Vault>,
}

pub fn handler(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
    ctx.accounts.vault.paused = paused;
    Ok(())
}
