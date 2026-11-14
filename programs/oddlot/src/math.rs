use anchor_lang::prelude::*;

use crate::error::OddlotError;
use crate::{KIND_CALL, KIND_PUT};

pub fn payoff_per_token(kind: u8, settle: u64, strike: u64, width: u64) -> Result<u64> {
    let raw = match kind {
        KIND_CALL => settle.saturating_sub(strike),
        KIND_PUT => strike.saturating_sub(settle),
        _ => return err!(OddlotError::InvalidSeriesParams),
    };
    Ok(raw.min(width))
}

/// Shares minted for a deposit. First deposit is 1:1. Later deposits floor.
pub fn shares_for_deposit(amount: u64, supply: u64, vault_usdc: u64) -> Result<u64> {
    if amount == 0 {
        return err!(OddlotError::ZeroQuantity);
    }
    if supply == 0 {
        return Ok(amount);
    }
    if vault_usdc == 0 {
        return err!(OddlotError::MathOverflow);
    }
    let shares = (amount as u128)
        .checked_mul(supply as u128)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?
        / (vault_usdc as u128);
    if shares == 0 {
        return err!(OddlotError::MathOverflow);
    }
    u64::try_from(shares).map_err(|_| error!(OddlotError::MathOverflow))
}

/// USDC returned for burned shares. Floors so rounding favors the vault.
pub fn usdc_for_shares(shares: u64, supply: u64, vault_usdc: u64) -> Result<u64> {
    if shares == 0 {
        return err!(OddlotError::ZeroQuantity);
    }
    if supply == 0 {
        return err!(OddlotError::MathOverflow);
    }
    let payout = (shares as u128)
        .checked_mul(vault_usdc as u128)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?
        / (supply as u128);
    u64::try_from(payout).map_err(|_| error!(OddlotError::MathOverflow))
}

pub fn check_utilization(new_locked: u64, new_balance: u64, max_util_bps: u16) -> Result<()> {
    let lhs = (new_locked as u128)
        .checked_mul(10_000)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    let rhs = (new_balance as u128)
        .checked_mul(max_util_bps as u128)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    if lhs > rhs {
        return err!(OddlotError::UtilizationCap);
    }
    Ok(())
}

/// Pyth price × 10^expo → USD × 10^6, rounding down.
pub fn pyth_price_to_usd_1e6(price: i64, expo: i32) -> Result<u64> {
    if price <= 0 {
        return err!(OddlotError::InvalidOracle);
    }
    let price = price as u128;
    if expo >= -6 {
        let factor = ten_pow((expo + 6) as u32)?;
        let scaled = price
            .checked_mul(factor)
            .ok_or_else(|| error!(OddlotError::MathOverflow))?;
        u64::try_from(scaled).map_err(|_| error!(OddlotError::MathOverflow))
    } else {
        let factor = ten_pow((-6 - expo) as u32)?;
        u64::try_from(price / factor).map_err(|_| error!(OddlotError::MathOverflow))
    }
}

pub fn mul_u64(a: u64, b: u64) -> Result<u64> {
    u64::try_from(
        (a as u128)
            .checked_mul(b as u128)
            .ok_or_else(|| error!(OddlotError::MathOverflow))?,
    )
    .map_err(|_| error!(OddlotError::MathOverflow))
}

fn ten_pow(exp: u32) -> Result<u128> {
    let mut acc = 1u128;
    let mut i = 0u32;
    while i < exp {
        acc = acc
            .checked_mul(10)
            .ok_or_else(|| error!(OddlotError::MathOverflow))?;
        i += 1;
    }
    Ok(acc)
}

#[cfg(test)]
mod tests {
    use super::*;

    const U: u64 = 1_000_000;

    #[test]
    fn payoff_table() {
        let k = 780 * U;
        let call_w = 20 * U;
        let put_w = 40 * U;
        let rows = [
            (700 * U, 0, 40 * U),
            (740 * U, 0, 40 * U),
            (760 * U, 0, 20 * U),
            (780 * U, 0, 0),
            (790 * U, 10 * U, 0),
            (800 * U, 20 * U, 0),
            (850 * U, 20 * U, 0),
        ];
        for (settle, call, put) in rows {
            assert_eq!(payoff_per_token(KIND_CALL, settle, k, call_w).unwrap(), call);
            assert_eq!(payoff_per_token(KIND_PUT, settle, k, put_w).unwrap(), put);
        }
    }

    #[test]
    fn deposit_share_math() {
        let first = 50_000 * U;
        assert_eq!(shares_for_deposit(first, 0, 0).unwrap(), first);
        let second = shares_for_deposit(10_000 * U, 50_000 * U, 55_000 * U).unwrap();
        assert_eq!(second, 9_090_909_090);
    }

    #[test]
    fn pyth_scaling() {
        assert_eq!(pyth_price_to_usd_1e6(71_760, -2).unwrap(), 717_600_000);
        assert_eq!(pyth_price_to_usd_1e6(780, 0).unwrap(), 780 * U);
        assert_eq!(pyth_price_to_usd_1e6(780_000_000, -6).unwrap(), 780 * U);
        assert_eq!(
            pyth_price_to_usd_1e6(78_000_000_000, -8).unwrap(),
            780 * U
        );
    }
}
