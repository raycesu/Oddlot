import { PublicKey } from "@solana/web3.js"

import { asBigint } from "./money.js"

export const KIND_CALL = 0
export const KIND_PUT = 1
export const ORACLE_PYTH = 0
export const ORACLE_DEMO = 1

export const underlyingBytes = (symbol: string): number[] => {
  const out = [0, 0, 0, 0, 0, 0, 0, 0]
  const bytes = Buffer.from(symbol)
  if (bytes.length > 8) {
    throw new Error(`underlying ${symbol} is longer than 8 bytes`)
  }
  bytes.forEach((byte, index) => {
    out[index] = byte
  })
  return out
}

export const feedIdBytes = (hex: string): number[] => {
  const clean = hex.replace(/^0x/, "")
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("pyth feed id must be 32 bytes of hex")
  }
  const out: number[] = []
  for (let index = 0; index < clean.length; index += 2) {
    out.push(Number.parseInt(clean.slice(index, index + 2), 16))
  }
  return out
}

export const zeroFeed = (): number[] => Array.from({ length: 32 }, () => 0)

const u64le = (value: bigint): Buffer => {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64LE(value)
  return buffer
}

const i64le = (value: bigint): Buffer => {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64LE(value)
  return buffer
}

export const findVault = (programId: PublicKey): PublicKey =>
  PublicKey.findProgramAddressSync([Buffer.from("vault")], programId)[0]

export const findUsdcVault = (programId: PublicKey, vault: PublicKey): PublicKey =>
  PublicKey.findProgramAddressSync([Buffer.from("usdc_vault"), vault.toBuffer()], programId)[0]

export const findDemoOracle = (programId: PublicKey, vault: PublicKey): PublicKey =>
  PublicKey.findProgramAddressSync([Buffer.from("demo_oracle"), vault.toBuffer()], programId)[0]

export const findSeries = (
  programId: PublicKey,
  vault: PublicKey,
  symbol: string,
  kind: number,
  strike: bigint,
  width: bigint,
  expiry: bigint,
): PublicKey =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("series"),
      vault.toBuffer(),
      Buffer.from(underlyingBytes(symbol)),
      Buffer.from([kind]),
      u64le(strike),
      u64le(width),
      i64le(expiry),
    ],
    programId,
  )[0]

export const findOptionMint = (programId: PublicKey, series: PublicKey): PublicKey =>
  PublicKey.findProgramAddressSync([Buffer.from("mint"), series.toBuffer()], programId)[0]

export type SeriesView = {
  address: PublicKey
  vault: PublicKey
  kind: number
  strike: bigint
  width: bigint
  expiry: bigint
  buyCutoffS: number
  oracleKind: number
  optionMint: PublicKey
  premium: bigint
  bsPremium: bigint
  crowdPremium: bigint
  quoteTs: bigint
  openInterest: bigint
  maxOpenInterest: bigint
  settled: boolean
  payoffPerToken: bigint
  bump: number
}

const field = (account: Record<string, unknown>, camel: string, snake: string): unknown =>
  account[camel] ?? account[snake]

const pubkey = (value: unknown): PublicKey =>
  value instanceof PublicKey ? value : new PublicKey(String(value))

export const readSeries = (address: PublicKey, account: Record<string, unknown>): SeriesView => ({
  address,
  vault: pubkey(field(account, "vault", "vault")),
  kind: Number(field(account, "kind", "kind")),
  strike: asBigint(field(account, "strike", "strike")),
  width: asBigint(field(account, "width", "width")),
  expiry: asBigint(field(account, "expiry", "expiry")),
  buyCutoffS: Number(field(account, "buyCutoffS", "buy_cutoff_s")),
  oracleKind: Number(field(account, "oracleKind", "oracle_kind")),
  optionMint: pubkey(field(account, "optionMint", "option_mint")),
  premium: asBigint(field(account, "premium", "premium")),
  bsPremium: asBigint(field(account, "bsPremium", "bs_premium")),
  crowdPremium: asBigint(field(account, "crowdPremium", "crowd_premium")),
  quoteTs: asBigint(field(account, "quoteTs", "quote_ts")),
  openInterest: asBigint(field(account, "openInterest", "open_interest")),
  maxOpenInterest: asBigint(field(account, "maxOpenInterest", "max_open_interest")),
  settled: Boolean(field(account, "settled", "settled")),
  payoffPerToken: asBigint(field(account, "payoffPerToken", "payoff_per_token")),
  bump: Number(field(account, "bump", "bump")),
})

export type VaultView = {
  address: PublicKey
  admin: PublicKey
  keeper: PublicKey
  usdcMint: PublicKey
  usdcVault: PublicKey
  lpMint: PublicKey
  totalLocked: bigint
}

export const readVault = (address: PublicKey, account: Record<string, unknown>): VaultView => ({
  address,
  admin: pubkey(field(account, "admin", "admin")),
  keeper: pubkey(field(account, "keeper", "keeper")),
  usdcMint: pubkey(field(account, "usdcMint", "usdc_mint")),
  usdcVault: pubkey(field(account, "usdcVault", "usdc_vault")),
  lpMint: pubkey(field(account, "lpMint", "lp_mint")),
  totalLocked: asBigint(field(account, "totalLocked", "total_locked")),
})
