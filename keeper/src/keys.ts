import { readFileSync } from "node:fs"

import { Keypair } from "@solana/web3.js"

export const loadKeypair = (filePath: string): Keypair => {
  const secret = JSON.parse(readFileSync(filePath, "utf8")) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}
