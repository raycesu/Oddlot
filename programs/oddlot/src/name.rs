use anchor_lang::prelude::*;

use crate::error::OddlotError;
use crate::{KIND_CALL, KIND_PUT};

const MONTHS: [&str; 12] = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

pub fn series_token_name(
    underlying: &[u8; 8],
    kind: u8,
    strike: u64,
    width: u64,
    expiry: i64,
) -> Result<String> {
    let symbol = underlying_symbol(underlying)?;
    let (year, month, day) = civil_date(expiry)?;
    let mon = MONTHS
        .get((month - 1) as usize)
        .copied()
        .ok_or_else(|| error!(OddlotError::InvalidSeriesParams))?;
    let (long, short) = match kind {
        KIND_CALL => (strike, strike.checked_add(width).ok_or_else(|| error!(OddlotError::MathOverflow))?),
        KIND_PUT => (strike, strike.checked_sub(width).ok_or_else(|| error!(OddlotError::InvalidSeriesParams))?),
        _ => return err!(OddlotError::InvalidSeriesParams),
    };
    let letter = match kind {
        KIND_CALL => "C",
        KIND_PUT => "P",
        _ => return err!(OddlotError::InvalidSeriesParams),
    };
    let yy = year % 100;
    Ok(format!(
        "{symbol} {day:02}{mon}{yy:02} {letter} {}/{}",
        format_usd(long),
        format_usd(short)
    ))
}

pub fn underlying_symbol(underlying: &[u8; 8]) -> Result<String> {
    let end = underlying.iter().position(|b| *b == 0).unwrap_or(underlying.len());
    let bytes = &underlying[..end];
    if bytes.is_empty() {
        return err!(OddlotError::InvalidSeriesParams);
    }
    String::from_utf8(bytes.to_vec()).map_err(|_| error!(OddlotError::InvalidSeriesParams))
}

fn format_usd(amount: u64) -> String {
    let whole = amount / 1_000_000;
    let frac = amount % 1_000_000;
    if frac == 0 {
        return whole.to_string();
    }
    let mut text = format!("{whole}.{frac:06}");
    while text.ends_with('0') {
        text.pop();
    }
    text
}

fn civil_date(ts: i64) -> Result<(i32, u32, u32)> {
    if ts < 0 {
        return err!(OddlotError::InvalidSeriesParams);
    }
    let z = ts.div_euclid(86_400) + 719_468;
    let era = z.div_euclid(146_097);
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };
    Ok((year as i32, month as u32, day as u32))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::KIND_PUT;

    #[test]
    fn year_end_put_name() {
        let mut underlying = [0u8; 8];
        underlying[..3].copy_from_slice(b"SPY");
        let name = series_token_name(
            &underlying,
            KIND_PUT,
            780_000_000,
            40_000_000,
            1_798_750_800,
        )
        .unwrap();
        assert_eq!(name, "SPY 31DEC26 P 780/740");
    }
}
