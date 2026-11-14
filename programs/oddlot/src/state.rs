use anchor_lang::prelude::*;

/// PDA seeds: `["vault"]`
#[account]
pub struct Vault {
    pub admin: Pubkey,
    pub keeper: Pubkey,
    pub usdc_mint: Pubkey,
    pub usdc_vault: Pubkey,
    pub lp_mint: Pubkey,
    pub total_locked: u64,
    pub max_util_bps: u16,
    pub quote_max_age_s: u32,
    pub oracle_max_age_s: u32,
    pub settle_window_s: u32,
    pub max_conf_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

/// PDA seeds: `["series", vault, underlying, [kind], strike_le, width_le, expiry_le]`
#[account]
pub struct Series {
    pub vault: Pubkey,
    /// ASCII, zero-padded (e.g. `b"SPY\0\0\0\0\0"`)
    pub underlying: [u8; 8],
    /// 0 = call, 1 = put
    pub kind: u8,
    pub strike: u64,
    pub width: u64,
    pub expiry: i64,
    pub buy_cutoff_s: u32,
    /// 0 = Pyth, 1 = Demo
    pub oracle_kind: u8,
    pub pyth_feed_id: [u8; 32],
    pub option_mint: Pubkey,
    pub premium: u64,
    pub bs_premium: u64,
    /// 0 = not available
    pub crowd_premium: u64,
    pub quote_ts: i64,
    pub open_interest: u64,
    pub max_open_interest: u64,
    pub settle_price: u64,
    pub payoff_per_token: u64,
    pub settled: bool,
    pub bump: u8,
}

/// PDA seeds: `["demo_oracle", vault]`
#[account]
pub struct DemoOracle {
    pub price: u64,
    pub ts: i64,
    pub bump: u8,
}
