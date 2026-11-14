use anchor_lang::prelude::*;

use crate::error::OddlotError;
use crate::math::pyth_price_to_usd_1e6;
use crate::pda::demo_oracle_address;
use crate::state::{DemoOracle, Series, Vault};
use crate::ORACLE_DEMO;
use crate::ORACLE_PYTH;

/// Pyth Solana Receiver (`pyth-solana-receiver-sdk` 2.0, not the pro variant).
pub const PYTH_RECEIVER_ID: Pubkey = pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

/// `sha256("account:PriceUpdateV2")[..8]`
const PRICE_UPDATE_V2_DISC: [u8; 8] = [34, 241, 35, 99, 157, 126, 244, 205];

#[derive(AnchorSerialize, AnchorDeserialize)]
enum PythVerification {
    Partial { num_signatures: u8 },
    Full,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
struct PythPriceMessage {
    feed_id: [u8; 32],
    price: i64,
    conf: u64,
    exponent: i32,
    publish_time: i64,
    prev_publish_time: i64,
    ema_price: i64,
    ema_conf: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
struct PythPriceUpdate {
    write_authority: Pubkey,
    verification_level: PythVerification,
    price_message: PythPriceMessage,
    posted_slot: u64,
}

pub struct Spot {
    pub usd_1e6: u64,
    pub publish_time: i64,
}

/// Read a demo or Pyth price. Pyth also enforces the vault confidence band.
pub fn load_spot(series: &Series, vault: &Vault, oracle: &AccountInfo) -> Result<Spot> {
    match series.oracle_kind {
        ORACLE_DEMO => load_demo(series, oracle),
        ORACLE_PYTH => load_pyth(series, vault, oracle),
        _ => err!(OddlotError::InvalidOracle),
    }
}

fn load_demo(series: &Series, oracle: &AccountInfo) -> Result<Spot> {
    let (expected, _) = demo_oracle_address(&series.vault);
    if oracle.key() != expected || oracle.owner != &crate::ID {
        return err!(OddlotError::InvalidOracle);
    }
    let mut data: &[u8] = &oracle.try_borrow_data()?;
    let demo = DemoOracle::try_deserialize(&mut data).map_err(|_| error!(OddlotError::InvalidOracle))?;
    if demo.price == 0 {
        return err!(OddlotError::InvalidOracle);
    }
    Ok(Spot {
        usd_1e6: demo.price,
        publish_time: demo.ts,
    })
}

fn load_pyth(series: &Series, vault: &Vault, oracle: &AccountInfo) -> Result<Spot> {
    if oracle.owner != &PYTH_RECEIVER_ID {
        return err!(OddlotError::InvalidOracle);
    }
    let data = oracle.try_borrow_data()?;
    if data.len() < 8 || data[..8] != PRICE_UPDATE_V2_DISC {
        return err!(OddlotError::InvalidOracle);
    }
    let mut rest = &data[8..];
    let update =
        PythPriceUpdate::deserialize(&mut rest).map_err(|_| error!(OddlotError::InvalidOracle))?;
    let _ = update.verification_level;
    if update.price_message.feed_id != series.pyth_feed_id {
        return err!(OddlotError::InvalidOracle);
    }
    let price = update.price_message.price;
    if price <= 0 {
        return err!(OddlotError::InvalidOracle);
    }
    let lhs = (update.price_message.conf as u128)
        .checked_mul(10_000)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    let rhs = (price as u128)
        .checked_mul(vault.max_conf_bps as u128)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    if lhs > rhs {
        return err!(OddlotError::OracleConfidence);
    }
    Ok(Spot {
        usd_1e6: pyth_price_to_usd_1e6(price, update.price_message.exponent)?,
        publish_time: update.price_message.publish_time,
    })
}

pub fn check_buy_age(publish_time: i64, now: i64, max_age_s: u32) -> Result<()> {
    if publish_time > now {
        return err!(OddlotError::InvalidOracle);
    }
    if now - publish_time > max_age_s as i64 {
        return err!(OddlotError::MarketClosed);
    }
    Ok(())
}

pub fn check_settle_window(publish_time: i64, expiry: i64, settle_window_s: u32) -> Result<()> {
    let end = expiry
        .checked_add(settle_window_s as i64)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    if publish_time < expiry || publish_time > end {
        return err!(OddlotError::SettlePriceOutOfWindow);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::pyth_price_to_usd_1e6;
    use anchor_lang::AnchorSerialize;
    use pyth_solana_receiver_sdk::price_update::{PriceFeedMessage, PriceUpdateV2, VerificationLevel};

    #[test]
    fn parses_sdk_price_update() {
        let feed = [7u8; 32];
        let update = PriceUpdateV2 {
            write_authority: Pubkey::default(),
            verification_level: VerificationLevel::Full,
            price_message: PriceFeedMessage {
                feed_id: feed,
                price: 71_760,
                conf: 10,
                exponent: -2,
                publish_time: 1_700_000_000,
                prev_publish_time: 1_699_999_000,
                ema_price: 71_760,
                ema_conf: 10,
            },
            posted_slot: 4,
        };
        let mut data = Vec::new();
        data.extend_from_slice(PriceUpdateV2::DISCRIMINATOR);
        update.serialize(&mut data).unwrap();
        assert_eq!(&data[..8], &PRICE_UPDATE_V2_DISC);

        let mut rest = &data[8..];
        let parsed = PythPriceUpdate::deserialize(&mut rest).unwrap();
        assert_eq!(parsed.price_message.feed_id, feed);
        assert_eq!(parsed.price_message.price, 71_760);
        assert_eq!(parsed.price_message.exponent, -2);
        assert_eq!(
            pyth_price_to_usd_1e6(parsed.price_message.price, parsed.price_message.exponent).unwrap(),
            717_600_000
        );
    }
}
