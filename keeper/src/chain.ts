import {
  ComputeBudgetProgram,
  Keypair,
  Transaction,
  type TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"

import type { KeeperConfig } from "./config.js"
import { log } from "./log.js"
import { getConnection } from "./program.js"

export const send = async (
  config: KeeperConfig,
  payer: Keypair,
  instructions: TransactionInstruction[],
  extraSigners: Keypair[] = [],
  label = "tx",
): Promise<string> => {
  const units = Math.min(1_400_000, 250_000 + instructions.length * 350_000)
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ...instructions,
  )
  tx.feePayer = payer.publicKey
  const signature = await sendAndConfirmTransaction(
    getConnection(config),
    tx,
    [payer, ...extraSigners],
    { commitment: "confirmed" },
  )
  log("tx", { label, signature })
  return signature
}
