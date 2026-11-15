import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadDotenv } from "dotenv"
import { PublicKey } from "@solana/web3.js"

import type { ShockPoint } from "./replay-math.js"

export type OddlotFile = {
  cluster: string
  underlying: string
  pyth_feed_id: string
  usdc_mint: string
  program_id: string
  vault: {
    max_util_bps: number
    quote_max_age_s: number
    oracle_max_age_s: number
    settle_window_s: number
    max_conf_bps: number
  }
  year_end: {
    expiry: string
    strike_step: number
    strike_band_pct: number
    widths: number[]
    kinds: string[]
    max_open_interest: number
    buy_cutoff_s: number
  }
  demo: {
    expiry_after_s: number
    buy_cutoff_s: number
    widths: number[]
    max_open_interest: number
    sigma: number
    replay_file: string
  }
  pricing: {
    min_premium: number
  }
  keeper: {
    quote_interval_s: number
    settle_poll_s: number
    exercise_batch: number
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))

const findRepoRoot = (start: string): string => {
  let cursor = start
  for (let hop = 0; hop < 6; hop += 1) {
    if (existsSync(path.join(cursor, "config", "oddlot.json"))) {
      return cursor
    }
    const parent = path.dirname(cursor)
    if (parent === cursor) {
      break
    }
    cursor = parent
  }
  throw new Error("could not find config/oddlot.json")
}

export const repoRoot = findRepoRoot(here)

loadDotenv({ path: path.join(repoRoot, ".env") })

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is empty. Set it in .env before running the keeper.`)
  }
  return value
}

const readJson = <T>(filePath: string): T => JSON.parse(readFileSync(filePath, "utf8")) as T

export type KeeperConfig = {
  repoRoot: string
  rpcUrl: string
  pricerUrl: string
  programId: PublicKey
  usdcMint: PublicKey
  feedId: string
  file: OddlotFile
  shock: ShockPoint[]
  adminPath: string
  keeperPath: string
  faucetPath: string
  lpPath: string
  buyerPaths: string[]
  keyDir: string
  faucetStatePath: string
  replayStatePath: string
  port: number
  streamToken: string
  quicknodeKey: string
  pythApiKey: string
}

export const loadConfig = (): KeeperConfig => {
  const file = readJson<OddlotFile>(path.join(repoRoot, "config", "oddlot.json"))
  const shock = readJson<ShockPoint[]>(path.join(repoRoot, file.demo.replay_file))
  const adminPath = required("ADMIN_KEYPAIR")
  const keyDir = path.dirname(adminPath)
  const pricerUrl = required("PRICER_URL").replace(/\/$/, "")
  return {
    repoRoot,
    rpcUrl: required("SOLANA_RPC_URL"),
    pricerUrl,
    programId: new PublicKey(process.env.ODDLOT_PROGRAM_ID?.trim() || file.program_id),
    usdcMint: new PublicKey(process.env.TEST_USDC_MINT?.trim() || file.usdc_mint),
    feedId: file.pyth_feed_id,
    file,
    shock,
    adminPath,
    keeperPath: required("KEEPER_KEYPAIR"),
    faucetPath: required("FAUCET_KEYPAIR"),
    lpPath: process.env.LP_KEYPAIR?.trim() || path.join(keyDir, "lp.json"),
    buyerPaths: [1, 2, 3, 4, 5].map((index) => path.join(keyDir, `buyer${index}.json`)),
    keyDir,
    faucetStatePath: path.join(repoRoot, "keeper", "data", "faucet.json"),
    replayStatePath: path.join(repoRoot, "keeper", "data", "replay.json"),
    port: Number(process.env.KEEPER_PORT || "8787"),
    streamToken: process.env.QUICKNODE_STREAM_TOKEN?.trim() || "",
    quicknodeKey: process.env.QUICKNODE_API_KEY?.trim() || "",
    pythApiKey: process.env.PYTH_API_KEY?.trim() || "",
  }
}
