use anchor_lang::prelude::*;

use crate::constants::*;

pub fn vault_address() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[VAULT_SEED], &crate::ID)
}

pub fn usdc_vault_address(vault: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[USDC_VAULT_SEED, vault.as_ref()], &crate::ID)
}

pub fn demo_oracle_address(vault: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[DEMO_ORACLE_SEED, vault.as_ref()], &crate::ID)
}

pub fn series_address(
    vault: &Pubkey,
    underlying: &[u8; 8],
    kind: u8,
    strike: u64,
    width: u64,
    expiry: i64,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            SERIES_SEED,
            vault.as_ref(),
            underlying.as_ref(),
            &[kind],
            &strike.to_le_bytes(),
            &width.to_le_bytes(),
            &expiry.to_le_bytes(),
        ],
        &crate::ID,
    )
}

pub fn option_mint_address(series: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[MINT_SEED, series.as_ref()], &crate::ID)
}
