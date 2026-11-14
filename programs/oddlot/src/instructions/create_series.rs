use anchor_lang::prelude::*;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_2022_extensions::token_metadata::{
    token_metadata_initialize, TokenMetadataInitialize,
};
use anchor_spl::token_interface::Mint;

use crate::constants::*;
use crate::error::OddlotError;
use crate::name::series_token_name;
use crate::state::{Series, Vault};

const METADATA_LAMPORTS: u64 = 20_000_000;

#[derive(Accounts)]
#[instruction(
    underlying: [u8; 8],
    kind: u8,
    strike: u64,
    width: u64,
    expiry: i64,
)]
pub struct CreateSeries<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [VAULT_SEED], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = admin,
        space = 8 + Series::INIT_SPACE,
        seeds = [
            SERIES_SEED,
            vault.key().as_ref(),
            &underlying,
            &[kind],
            &strike.to_le_bytes(),
            &width.to_le_bytes(),
            &expiry.to_le_bytes(),
        ],
        bump,
    )]
    pub series: Account<'info, Series>,
    #[account(
        init,
        payer = admin,
        seeds = [MINT_SEED, series.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = series,
        mint::freeze_authority = series,
        mint::token_program = token_2022_program,
        extensions::permanent_delegate::delegate = series,
        extensions::metadata_pointer::authority = series,
        extensions::metadata_pointer::metadata_address = option_mint,
    )]
    pub option_mint: InterfaceAccount<'info, Mint>,
    pub token_2022_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateSeries>,
    underlying: [u8; 8],
    kind: u8,
    strike: u64,
    width: u64,
    expiry: i64,
    buy_cutoff_s: u32,
    oracle_kind: u8,
    pyth_feed_id: [u8; 32],
    max_open_interest: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let cutoff_at = now
        .checked_add(buy_cutoff_s as i64)
        .ok_or_else(|| error!(OddlotError::MathOverflow))?;
    if width == 0
        || max_open_interest == 0
        || (kind != KIND_CALL && kind != KIND_PUT)
        || (oracle_kind != ORACLE_PYTH && oracle_kind != ORACLE_DEMO)
        || expiry <= cutoff_at
        || (kind == KIND_PUT && width > strike)
        || (oracle_kind == ORACLE_PYTH && pyth_feed_id == [0u8; 32])
    {
        return err!(OddlotError::InvalidSeriesParams);
    }

    let name = series_token_name(&underlying, kind, strike, width, expiry)?;
    let series = &mut ctx.accounts.series;
    series.vault = ctx.accounts.vault.key();
    series.underlying = underlying;
    series.kind = kind;
    series.strike = strike;
    series.width = width;
    series.expiry = expiry;
    series.buy_cutoff_s = buy_cutoff_s;
    series.oracle_kind = oracle_kind;
    series.pyth_feed_id = pyth_feed_id;
    series.option_mint = ctx.accounts.option_mint.key();
    series.premium = 0;
    series.bs_premium = 0;
    series.crowd_premium = 0;
    series.quote_ts = 0;
    series.open_interest = 0;
    series.max_open_interest = max_open_interest;
    series.settle_price = 0;
    series.payoff_per_token = 0;
    series.settled = false;
    series.bump = ctx.bumps.series;

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.option_mint.to_account_info(),
            },
        ),
        METADATA_LAMPORTS,
    )?;

    let strike_le = strike.to_le_bytes();
    let width_le = width.to_le_bytes();
    let expiry_le = expiry.to_le_bytes();
    let bump = [ctx.bumps.series];
    let kind_seed = [kind];
    let vault_key = ctx.accounts.vault.key();
    let seeds: &[&[u8]] = &[
        SERIES_SEED,
        vault_key.as_ref(),
        underlying.as_ref(),
        &kind_seed,
        &strike_le,
        &width_le,
        &expiry_le,
        &bump,
    ];
    token_metadata_initialize(
        CpiContext::new_with_signer(
            ctx.accounts.token_2022_program.key(),
            TokenMetadataInitialize {
                program_id: ctx.accounts.token_2022_program.to_account_info(),
                metadata: ctx.accounts.option_mint.to_account_info(),
                update_authority: ctx.accounts.series.to_account_info(),
                mint: ctx.accounts.option_mint.to_account_info(),
                mint_authority: ctx.accounts.series.to_account_info(),
            },
            &[seeds],
        ),
        name,
        "SPY".to_string(),
        "https://oddlot.local".to_string(),
    )?;
    Ok(())
}
