/// Kind: call
pub const KIND_CALL: u8 = 0;
/// Kind: put
pub const KIND_PUT: u8 = 1;

/// Oracle: Pyth pull
pub const ORACLE_PYTH: u8 = 0;
/// Oracle: demo replay
pub const ORACLE_DEMO: u8 = 1;

pub const VAULT_SEED: &[u8] = b"vault";
pub const SERIES_SEED: &[u8] = b"series";
pub const DEMO_ORACLE_SEED: &[u8] = b"demo_oracle";
pub const USDC_VAULT_SEED: &[u8] = b"usdc_vault";
pub const MINT_SEED: &[u8] = b"mint";
