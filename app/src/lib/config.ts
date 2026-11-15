import oddlotConfig from "@/data/config.json"

export type OddlotFileConfig = typeof oddlotConfig

export const fileConfig: OddlotFileConfig = oddlotConfig

export const appConfig = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com",
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || fileConfig.program_id,
  pricerUrl: (process.env.NEXT_PUBLIC_PRICER_URL || "http://127.0.0.1:8000").replace(/\/$/, ""),
  keeperUrl: (process.env.NEXT_PUBLIC_KEEPER_URL || "http://127.0.0.1:8787").replace(/\/$/, ""),
  usdcMint: fileConfig.usdc_mint,
  pythFeedId: fileConfig.pyth_feed_id,
  underlying: fileConfig.underlying,
  yearEndExpiry: fileConfig.year_end.expiry,
  roundLot: fileConfig.hedging.round_lot,
  explorerBase: "https://explorer.solana.com",
  cluster: fileConfig.cluster,
}

export const explorerTxUrl = (signature: string): string =>
  `${appConfig.explorerBase}/tx/${signature}?cluster=${appConfig.cluster}`
