import { BN, type Program } from "@coral-xyz/anchor"
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import {
  Connection,
  PublicKey,
  Transaction,
  type TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js"

export type AppWallet = {
  publicKey: PublicKey
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>
}

import { fetchPythUpdate } from "./api"
import { appConfig } from "./config"
import { maxCostFor } from "./money"
import { ORACLE_DEMO, ORACLE_PYTH, findDemoOracle, type SeriesView, type VaultView } from "./pdas"
import { createProgram, getProgramId } from "./program"

const u64 = (value: bigint): BN => new BN(value.toString())

const feedIdHex = (hex: string): string => (hex.startsWith("0x") ? hex : `0x${hex}`)

type MethodsBuy = {
  buy: (
    qty: BN,
    maxCost: BN,
  ) => {
    accounts: (accounts: Record<string, PublicKey>) => {
      instruction: () => Promise<TransactionInstruction>
    }
  }
}

const methodsOf = (program: Program): MethodsBuy => program.methods as unknown as MethodsBuy

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

const sendPythBuy = async (
  connection: Connection,
  wallet: AppWallet,
  updateData: string[],
  buildBuyIx: (oracle: PublicKey) => Promise<TransactionInstruction>,
): Promise<string> => {
  const { PythSolanaReceiver } = await import("@pythnetwork/pyth-solana-receiver")
  const receiver = new PythSolanaReceiver({
    connection,
    wallet: wallet as never,
  })
  const builder = receiver.newTransactionBuilder({ closeUpdateAccounts: true })
  await builder.addPostPriceUpdates(updateData)
  await builder.addPriceConsumerInstructions(async (getPriceUpdateAccount: (feedId: string) => PublicKey) => {
    const oracle = getPriceUpdateAccount(feedIdHex(appConfig.pythFeedId))
    return [{ instruction: await buildBuyIx(oracle), signers: [], computeUnits: 400_000 }]
  })
  const built = await builder.buildVersionedTransactions({
    computeUnitPriceMicroLamports: 50_000,
  })
  let lastSig = ""
  for (const item of built) {
    const tx = item.tx as VersionedTransaction
    const signed = (await wallet.signTransaction(tx)) as VersionedTransaction
    lastSig = await connection.sendRawTransaction(signed.serialize())
    const blockhash = await connection.getLatestBlockhash()
    await connection.confirmTransaction(
      { signature: lastSig, blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight },
      "confirmed",
    )
  }
  return lastSig
}

export const buyOption = async (args: {
  connection: Connection
  wallet: AppWallet
  vault: VaultView
  series: SeriesView
  qty: bigint
}): Promise<string> => {
  const { connection, wallet, vault, series, qty } = args
  if (qty <= 0n) {
    throw new Error("ZeroQuantity")
  }
  const program = createProgram(connection, wallet)
  const maxCost = maxCostFor(series.premium, qty)
  const buyerUsdc = getAssociatedTokenAddressSync(
    vault.usdcMint,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
  )
  const buyerOptions = getAssociatedTokenAddressSync(
    series.optionMint,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
  )
  const setup = [
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      buyerUsdc,
      wallet.publicKey,
      vault.usdcMint,
      TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      buyerOptions,
      wallet.publicKey,
      series.optionMint,
      TOKEN_2022_PROGRAM_ID,
    ),
  ]

  const buyIx = (oracle: PublicKey) =>
    methodsOf(program)
      .buy(u64(qty), u64(maxCost))
      .accounts({
        buyer: wallet.publicKey,
        vault: vault.address,
        series: series.address,
        oracle,
        usdcVault: vault.usdcVault,
        buyerUsdc,
        optionMint: series.optionMint,
        buyerOptions,
        tokenProgram: TOKEN_PROGRAM_ID,
        token2022Program: TOKEN_2022_PROGRAM_ID,
      })
      .instruction()

  if (series.oracleKind === ORACLE_DEMO) {
    const oracle = findDemoOracle(getProgramId(), vault.address)
    return sendLegacy(connection, wallet, [...setup, await buyIx(oracle)])
  }
  if (series.oracleKind !== ORACLE_PYTH) {
    throw new Error(`unknown oracle kind ${series.oracleKind}`)
  }
  await sendLegacy(connection, wallet, setup)
  const hermes = await fetchPythUpdate()
  return sendPythBuy(connection, wallet, hermes.updateData, buyIx)
}
