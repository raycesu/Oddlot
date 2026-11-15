import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { PublicKey } from "@solana/web3.js"

import { mintTestUsdc, transferSol } from "./actions.js"
import type { KeeperConfig } from "./config.js"
import { loadKeypair } from "./keys.js"
import { USD } from "./money.js"

const HOUR_MS = 60 * 60 * 1000
const USDC_AMOUNT = 1_000n * USD
const SOL_LAMPORTS = 50_000_000

type FaucetBook = Record<string, number>

const readBook = (filePath: string): FaucetBook => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as FaucetBook
  } catch {
    return {}
  }
}

const writeBook = (filePath: string, book: FaucetBook): void => {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(book, null, 2)}\n`)
}

export type FaucetResult =
  | { ok: true; signature: string; usdc: string; sol: string }
  | { ok: false; status: number; error: string; retryAfterS?: number }

export const fundWallet = async (config: KeeperConfig, wallet: string): Promise<FaucetResult> => {
  let owner: PublicKey
  try {
    owner = new PublicKey(wallet)
  } catch {
    return { ok: false, status: 400, error: "wallet must be a solana public key" }
  }
  const book = readBook(config.faucetStatePath)
  const last = book[owner.toBase58()] ?? 0
  const elapsed = Date.now() - last
  if (last && elapsed < HOUR_MS) {
    return {
      ok: false,
      status: 429,
      error: "this wallet already used the faucet in the last hour",
      retryAfterS: Math.ceil((HOUR_MS - elapsed) / 1000),
    }
  }
  const faucet = loadKeypair(config.faucetPath)
  const signature = await mintTestUsdc(config, faucet, owner, USDC_AMOUNT)
  await transferSol(config, faucet, owner, SOL_LAMPORTS)
  book[owner.toBase58()] = Date.now()
  writeBook(config.faucetStatePath, book)
  return { ok: true, signature, usdc: "1000.00", sol: "0.05" }
}
