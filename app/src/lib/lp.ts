import { BN } from "@coral-xyz/anchor"
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import { Connection, PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js"

import type { AppWallet } from "./buy"
import type { VaultView } from "./pdas"
import { createProgram } from "./program"

const u64 = (value: bigint): BN => new BN(value.toString())

const sendLegacy = async (
  connection: Connection,
  wallet: AppWallet,
  ixs: TransactionInstruction[],
): Promise<string> => {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  const tx = new Transaction({
    feePayer: wallet.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(...ixs)
  const signed = await wallet.signTransaction(tx)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
  return signature
}

type LpMethods = {
  deposit: (amount: BN) => {
    accounts: (accounts: Record<string, PublicKey>) => {
      instruction: () => Promise<TransactionInstruction>
    }
  }
  withdraw: (shares: BN) => {
    accounts: (accounts: Record<string, PublicKey>) => {
      instruction: () => Promise<TransactionInstruction>
    }
  }
}

export const depositUsdc = async (args: {
  connection: Connection
  wallet: AppWallet
  vault: VaultView
  amount: bigint
}): Promise<string> => {
  const { connection, wallet, vault, amount } = args
  const program = createProgram(connection, wallet)
  const methods = program.methods as unknown as LpMethods
  const lpUsdc = getAssociatedTokenAddressSync(vault.usdcMint, wallet.publicKey, false, TOKEN_PROGRAM_ID)
  const lpShares = getAssociatedTokenAddressSync(vault.lpMint, wallet.publicKey, false, TOKEN_PROGRAM_ID)
  const createShares = createAssociatedTokenAccountIdempotentInstruction(
    wallet.publicKey,
    lpShares,
    wallet.publicKey,
    vault.lpMint,
    TOKEN_PROGRAM_ID,
  )
  const deposit = await methods
    .deposit(u64(amount))
    .accounts({
      lp: wallet.publicKey,
      vault: vault.address,
      usdcVault: vault.usdcVault,
      lpUsdc,
      lpMint: vault.lpMint,
      lpShares,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction()
  return sendLegacy(connection, wallet, [createShares, deposit])
}

export const withdrawShares = async (args: {
  connection: Connection
  wallet: AppWallet
  vault: VaultView
  shares: bigint
}): Promise<string> => {
  const { connection, wallet, vault, shares } = args
  const program = createProgram(connection, wallet)
  const methods = program.methods as unknown as LpMethods
  const lpUsdc = getAssociatedTokenAddressSync(vault.usdcMint, wallet.publicKey, false, TOKEN_PROGRAM_ID)
  const lpShares = getAssociatedTokenAddressSync(vault.lpMint, wallet.publicKey, false, TOKEN_PROGRAM_ID)
  const withdraw = await methods
    .withdraw(u64(shares))
    .accounts({
      lp: wallet.publicKey,
      vault: vault.address,
      usdcVault: vault.usdcVault,
      lpUsdc,
      lpMint: vault.lpMint,
      lpShares,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction()
  return sendLegacy(connection, wallet, [withdraw])
}
