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
  type Signer,
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

const feedIdHex = (hex: string): string => {
  const clean = hex.replace(/^0x/i, "").toLowerCase()
  return `0x${clean}`
}

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

const preflightOrThrow = async (
  connection: Connection,
  tx: Transaction | VersionedTransaction,
): Promise<void> => {
  const sim =
    tx instanceof VersionedTransaction
      ? await connection.simulateTransaction(tx, { sigVerify: false, commitment: "confirmed" })
      : await connection.simulateTransaction(tx)
  if (!sim.value.err) {
    return
  }
  const logs = sim.value.logs?.join("\n") ?? ""
  throw new Error(`Transaction simulation failed: ${JSON.stringify(sim.value.err)}\n${logs}`)
}

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
  // Surface Anchor errors before Phantom's opaque "unsafe" / failed-sim UI.
  await preflightOrThrow(connection, tx)
  const signed = await wallet.signTransaction(tx)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
  return signature
}

/**
 * Year-end buys post a Pyth PriceUpdateV2, then consume it in `buy`.
 * Ephemeral keypairs own those update accounts — the wallet alone cannot sign them.
 * Matches `@pythnetwork/solana-utils` `sendTransactions` / keeper `sendPythConsumer`.
 */
const sendPythBuy = async (
  connection: Connection,
  wallet: AppWallet,
  feedId: string,
  updateData: string[],
  setup: TransactionInstruction[],
  buildBuyIx: (oracle: PublicKey) => Promise<TransactionInstruction>,
): Promise<string> => {
  const { PythSolanaReceiver } = await import("@pythnetwork/pyth-solana-receiver")
  const receiver = new PythSolanaReceiver({
    connection,
    wallet: wallet as never,
  })
  const builder = receiver.newTransactionBuilder({ closeUpdateAccounts: true })
  await builder.addPostPriceUpdates(updateData)
  const feedKey = feedIdHex(feedId)
  await builder.addPriceConsumerInstructions(async (getPriceUpdateAccount: (id: string) => PublicKey) => {
    const oracle = getPriceUpdateAccount(feedKey)
    return [
      ...setup.map((instruction) => ({ instruction, signers: [] as Signer[] })),
      { instruction: await buildBuyIx(oracle), signers: [] as Signer[], computeUnits: 400_000 },
    ]
  })
  const built = await builder.buildVersionedTransactions({
    computeUnitPriceMicroLamports: 50_000,
  })
  let lastSig = ""
  for (const item of built) {
    const tx = item.tx as VersionedTransaction
    const ephemeral = (item.signers ?? []) as Signer[]
    if (ephemeral.length > 0) {
      tx.sign(ephemeral)
    }
    // Surface Anchor errors before Phantom's opaque failed-sim UI.
    await preflightOrThrow(connection, tx)
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
  const feedId = series.pythFeedId || appConfig.pythFeedId
  const expected = appConfig.pythFeedId.replace(/^0x/i, "").toLowerCase()
  if (feedId.toLowerCase() !== expected) {
    throw new Error(
      `InvalidOracle: series feed ${feedId.slice(0, 8)}… does not match app feed ${expected.slice(0, 8)}…`,
    )
  }
  const hermes = await fetchPythUpdate(feedId)
  return sendPythBuy(connection, wallet, feedId, hermes.updateData, setup, buyIx)
}
