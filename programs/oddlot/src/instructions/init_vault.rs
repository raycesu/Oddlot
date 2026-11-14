use anchor_lang::prelude::*;

use crate::error::OddlotError;

/// Account metas are filled in M1 per `PRD.md` Program spec.
#[derive(Accounts)]
pub struct InitVault<'info> {
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<InitVault>,
    _keeper: Pubkey,
    _max_util_bps: u16,
    _quote_max_age_s: u32,
    _oracle_max_age_s: u32,
    _settle_window_s: u32,
    _max_conf_bps: u16,
) -> Result<()> {
    let _ = ctx;
    err!(OddlotError::NotImplemented)
}
