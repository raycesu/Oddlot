use anchor_lang::prelude::*;

#[error_code]
pub enum OddlotError {
    #[msg("Sales are paused")]
    Paused,
    #[msg("Quantity must be greater than zero")]
    ZeroQuantity,
    #[msg("Buy window has closed for this series")]
    BuyWindowClosed,
    #[msg("On-chain quote is stale")]
    QuoteStale,
    #[msg("Market closed or oracle price is stale")]
    MarketClosed,
    #[msg("Oracle confidence too wide")]
    OracleConfidence,
    #[msg("Invalid oracle account or feed id")]
    InvalidOracle,
    #[msg("Open interest cap exceeded")]
    OpenInterestCap,
    #[msg("Slippage exceeded max_cost")]
    SlippageExceeded,
    #[msg("Vault utilization cap exceeded")]
    UtilizationCap,
    #[msg("Insufficient free liquidity for withdrawal")]
    InsufficientFreeLiquidity,
    #[msg("Series has not expired")]
    NotExpired,
    #[msg("Series already settled")]
    AlreadySettled,
    #[msg("Series is not settled")]
    NotSettled,
    #[msg("Settle price outside allowed window")]
    SettlePriceOutOfWindow,
    #[msg("Invalid series parameters")]
    InvalidSeriesParams,
    #[msg("Wrong option mint")]
    WrongMint,
    #[msg("Unauthorized signer")]
    Unauthorized,
    #[msg("Checked math overflow")]
    MathOverflow,
    #[msg("Instruction not implemented in scaffold")]
    NotImplemented,
}
