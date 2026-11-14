use anchor_lang::prelude::*;

#[event]
pub struct Deposited {
    pub lp: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub ts: i64,
}

#[event]
pub struct Withdrawn {
    pub lp: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub ts: i64,
}

#[event]
pub struct Quoted {
    pub series: Pubkey,
    pub premium: u64,
    pub bs_premium: u64,
    pub crowd_premium: u64,
    pub ts: i64,
}

#[event]
pub struct Bought {
    pub buyer: Pubkey,
    pub series: Pubkey,
    pub qty: u64,
    pub cost: u64,
    pub spot: u64,
    pub ts: i64,
}

#[event]
pub struct Settled {
    pub series: Pubkey,
    pub price: u64,
    pub payoff_per_token: u64,
    pub ts: i64,
}

#[event]
pub struct Exercised {
    pub holder: Pubkey,
    pub series: Pubkey,
    pub qty: u64,
    pub paid: u64,
    pub ts: i64,
}
