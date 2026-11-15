import { createRequire } from "node:module"

import { BN, Wallet } from "@coral-xyz/anchor"
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import { Keypair, PublicKey, SystemProgram, type TransactionInstruction } from "@solana/web3.js"

import type { KeeperConfig } from "./config.js"
import { send } from "./chain.js"
import { loadKeypair } from "./keys.js"
import { log, logError } from "./log.js"
import { USD, asBigint } from "./money.js"
import {
  ORACLE_DEMO,
  ORACLE_PYTH,
  findDemoOracle,
  findOptionMint,
  findSeries,
  findUsdcVault,
  findVault,
  readSeries,
  readVault,
  underlyingBytes,
  type SeriesView,
  type VaultView,
} from "./pdas.js"
import { programFor, getConnection } from "./program.js"
import { feedIdHex, fetchSettleUpdate, type HermesPrice } from "./pyth.js"

const require = createRequire(import.meta.url)

const u64 = (value: bigint): BN => new BN(value.toString())

const methods = (program: ReturnType<typeof programFor>) =>
  program.methods as unknown as Record<string, (...args: unknown[]) => InstructionBuilder>

type InstructionBuilder = {
  accounts: (accounts: Record<string, PublicKey>) => {
    instruction: () => Promise<TransactionInstruction>
  }
}

const accountsOf = (program: ReturnType<typeof programFor>) =>
  program.account as unknown as Record<
    string,
    {
      fetchNullable: (address: PublicKey) => Promise<Record<string, unknown> | null>
      all: () => Promise<{ publicKey: PublicKey; account: Record<string, unknown> }[]>
    }
  >

export type Signers = {
  admin: Keypair
  keeper: Keypair
  faucet: Keypair
  lp: Keypair
  buyers: Keypair[]
}

export const loadSigners = (config: KeeperConfig): Signers => ({
  admin: loadKeypair(config.adminPath),
  keeper: loadKeypair(config.keeperPath),
  faucet: loadKeypair(config.faucetPath),
  lp: loadKeypair(config.lpPath),
  buyers: config.buyerPaths.map((filePath) => loadKeypair(filePath)),
})

export const nowSeconds = (): bigint => BigInt(Math.floor(Date.now() / 1000))

export const fetchVault = async (
  config: KeeperConfig,
  reader: Keypair,
): Promise<VaultView | null> => {
  const address = findVault(config.programId)
  const account = await accountsOf(programFor(config, reader)).vault.fetchNullable(address)
  return account ? readVault(address, account) : null
}

export const fetchSeries = async (
  config: KeeperConfig,
  reader: Keypair,
  address: PublicKey,
): Promise<SeriesView | null> => {
  const account = await accountsOf(programFor(config, reader)).series.fetchNullable(address)
  return account ? readSeries(address, account) : null
}

export const listSeries = async (config: KeeperConfig, reader: Keypair): Promise<SeriesView[]> => {
  const rows = await accountsOf(programFor(config, reader)).series.all()
  return rows.map((row) => readSeries(row.publicKey, row.account))
}

export const initVaultIfMissing = async (config: KeeperConfig, signers: Signers): Promise<VaultView> => {
  const existing = await fetchVault(config, signers.admin)
  if (existing) {
    if (!existing.keeper.equals(signers.keeper.publicKey)) {
      throw new Error("vault keeper does not match KEEPER_KEYPAIR")
    }
    log("vault_exists", { vault: existing.address.toBase58() })
    return existing
  }
  const vault = findVault(config.programId)
  const lpMint = Keypair.generate()
  const program = programFor(config, signers.admin)
  const ix = await methods(program)
    .initVault(
      signers.keeper.publicKey,
      config.file.vault.max_util_bps,
      config.file.vault.quote_max_age_s,
      config.file.vault.oracle_max_age_s,
      config.file.vault.settle_window_s,
      config.file.vault.max_conf_bps,
    )
    .accounts({
      admin: signers.admin.publicKey,
      vault,
      usdcMint: config.usdcMint,
      usdcVault: findUsdcVault(config.programId, vault),
      lpMint: lpMint.publicKey,
      demoOracle: findDemoOracle(config.programId, vault),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction()
  await send(config, signers.admin, [ix], [lpMint], "init_vault")
  const created = await fetchVault(config, signers.admin)
  if (!created) {
    throw new Error("vault missing after init")
  }
  return created
}

const tokenBalance = async (
  config: KeeperConfig,
  address: PublicKey,
): Promise<bigint> => {
  try {
    const account = await getAccount(getConnection(config), address, "confirmed", TOKEN_PROGRAM_ID)
    return asBigint(account.amount)
  } catch {
    return 0n
  }
}

export const mintTestUsdc = async (
  config: KeeperConfig,
  faucet: Keypair,
  owner: PublicKey,
  amount: bigint,
): Promise<string> => {
  const destination = getAssociatedTokenAddressSync(config.usdcMint, owner, false, TOKEN_PROGRAM_ID)
  const create = createAssociatedTokenAccountIdempotentInstruction(
    faucet.publicKey,
    destination,
    owner,
    config.usdcMint,
    TOKEN_PROGRAM_ID,
  )
  const mint = createMintToInstruction(
    config.usdcMint,
    destination,
    faucet.publicKey,
    amount,
    [],
    TOKEN_PROGRAM_ID,
  )
  return send(config, faucet, [create, mint], [], "mint_usdc")
}

export const transferSol = async (
  config: KeeperConfig,
  from: Keypair,
  to: PublicKey,
  lamports: number,
): Promise<string> => {
  const ix = SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: to,
    lamports,
  })
  return send(config, from, [ix], [], "transfer_sol")
}

export const ensureLpDeposit = async (
  config: KeeperConfig,
  signers: Signers,
  vault: VaultView,
): Promise<void> => {
  const target = 50_000n * USD
  const held = await tokenBalance(config, vault.usdcVault)
  if (held >= target) {
    log("lp_deposit_skip", { held: held.toString() })
    return
  }
  const lp = signers.admin
  await mintTestUsdc(config, signers.faucet, lp.publicKey, target)
  const lpUsdc = getAssociatedTokenAddressSync(config.usdcMint, lp.publicKey, false, TOKEN_PROGRAM_ID)
  const lpShares = getAssociatedTokenAddressSync(vault.lpMint, lp.publicKey, false, TOKEN_PROGRAM_ID)
  const createShares = createAssociatedTokenAccountIdempotentInstruction(
    lp.publicKey,
    lpShares,
    lp.publicKey,
    vault.lpMint,
    TOKEN_PROGRAM_ID,
  )
  const program = programFor(config, lp)
  const deposit = await methods(program)
    .deposit(u64(target))
    .accounts({
      lp: lp.publicKey,
      vault: vault.address,
      usdcVault: vault.usdcVault,
      lpUsdc,
      lpMint: vault.lpMint,
      lpShares,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction()
  await send(config, lp, [createShares, deposit], [], "deposit")
}

export type SeriesParams = {
  symbol: string
  kind: number
  strike: bigint
  width: bigint
  expiry: bigint
  buyCutoffS: number
  oracleKind: number
  feed: number[]
  maxOpenInterest: bigint
}

export const createSeriesIfMissing = async (
  config: KeeperConfig,
  admin: Keypair,
  vault: PublicKey,
  params: SeriesParams,
): Promise<PublicKey> => {
  const series = findSeries(
    config.programId,
    vault,
    params.symbol,
    params.kind,
    params.strike,
    params.width,
    params.expiry,
  )
  const existing = await fetchSeries(config, admin, series)
  if (existing) {
    return series
  }
  const optionMint = findOptionMint(config.programId, series)
  const program = programFor(config, admin)
  const ix = await methods(program)
    .createSeries(
      underlyingBytes(params.symbol),
      params.kind,
      u64(params.strike),
      u64(params.width),
      new BN(params.expiry.toString()),
      params.buyCutoffS,
      params.oracleKind,
      params.feed,
      u64(params.maxOpenInterest),
    )
    .accounts({
      admin: admin.publicKey,
      vault,
      series,
      optionMint,
      token2022Program: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction()
  await send(config, admin, [ix], [], "create_series")
  return series
}

export const buildPostQuoteIx = async (
  config: KeeperConfig,
  keeper: Keypair,
  vault: PublicKey,
  series: PublicKey,
  premium: bigint,
  bsPremium: bigint,
  crowdPremium: bigint,
): Promise<TransactionInstruction> => {
  const program = programFor(config, keeper)
  return methods(program)
    .postQuote(u64(premium), u64(bsPremium), u64(crowdPremium))
    .accounts({
      keeper: keeper.publicKey,
      vault,
      series,
    })
    .instruction()
}

export const postQuote = async (
  config: KeeperConfig,
  keeper: Keypair,
  vault: PublicKey,
  series: PublicKey,
  premium: bigint,
  bsPremium: bigint,
  crowdPremium: bigint,
): Promise<string> => {
  if (premium <= 0n) {
    throw new Error("premium must be positive")
  }
  const ix = await buildPostQuoteIx(config, keeper, vault, series, premium, bsPremium, crowdPremium)
  return send(config, keeper, [ix], [], "post_quote")
}

export const setDemoPrice = async (
  config: KeeperConfig,
  keeper: Keypair,
  vault: PublicKey,
  price: bigint,
): Promise<string> => {
  const program = programFor(config, keeper)
  const ix = await methods(program)
    .setDemoPrice(u64(price))
    .accounts({
      keeper: keeper.publicKey,
      vault,
      demoOracle: findDemoOracle(config.programId, vault),
    })
    .instruction()
  return send(config, keeper, [ix], [], "set_demo_price")
}

const sendPythConsumer = async (
  config: KeeperConfig,
  payer: Keypair,
  update: HermesPrice,
  consumer: (oracle: PublicKey) => Promise<TransactionInstruction>,
  label: string,
): Promise<void> => {
  const { PythSolanaReceiver } = require("@pythnetwork/pyth-solana-receiver") as {
    PythSolanaReceiver: new (args: {
      connection: ReturnType<typeof getConnection>
      wallet: Wallet
    }) => {
      newTransactionBuilder: (config: { closeUpdateAccounts: boolean }) => {
        addPostPriceUpdates: (data: string[]) => Promise<void>
        addPriceConsumerInstructions: (
          getInstructions: (
            getPriceUpdateAccount: (feedId: string) => PublicKey,
          ) => Promise<{ instruction: TransactionInstruction; signers: Keypair[]; computeUnits?: number }[]>,
        ) => Promise<void>
        buildVersionedTransactions: (args: { computeUnitPriceMicroLamports: number }) => Promise<
          { tx: { sign: (signers: Keypair[]) => void; serialize: () => Uint8Array }; signers: Keypair[] }[]
        >
      }
    }
  }
  const receiver = new PythSolanaReceiver({
    connection: getConnection(config),
    wallet: new Wallet(payer),
  })
  const builder = receiver.newTransactionBuilder({ closeUpdateAccounts: true })
  await builder.addPostPriceUpdates(update.updateData)
  await builder.addPriceConsumerInstructions(async (getPriceUpdateAccount: (feedId: string) => PublicKey) => {
    const oracle = getPriceUpdateAccount(feedIdHex(config.feedId))
    return [{ instruction: await consumer(oracle), signers: [], computeUnits: 400_000 }]
  })
  const built = await builder.buildVersionedTransactions({
    computeUnitPriceMicroLamports: 50_000,
  })
  const connection = getConnection(config)
  for (const item of built) {
    item.tx.sign([payer, ...item.signers])
    const signature = await connection.sendRawTransaction(item.tx.serialize())
    const blockhash = await connection.getLatestBlockhash()
    await connection.confirmTransaction(
      { signature, blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight },
      "confirmed",
    )
    log("tx", { label, signature })
  }
}

export const buySeries = async (
  config: KeeperConfig,
  buyer: Keypair,
  vault: VaultView,
  series: SeriesView,
  qty: bigint,
): Promise<string> => {
  const cost = series.premium * qty
  const maxCost = cost + cost / 100n + 1n
  const buyerUsdc = getAssociatedTokenAddressSync(
    vault.usdcMint,
    buyer.publicKey,
    false,
    TOKEN_PROGRAM_ID,
  )
  const buyerOptions = getAssociatedTokenAddressSync(
    series.optionMint,
    buyer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
  )
  const setup = [
    createAssociatedTokenAccountIdempotentInstruction(
      buyer.publicKey,
      buyerUsdc,
      buyer.publicKey,
      vault.usdcMint,
      TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      buyer.publicKey,
      buyerOptions,
      buyer.publicKey,
      series.optionMint,
      TOKEN_2022_PROGRAM_ID,
    ),
  ]
  const program = programFor(config, buyer)
  const buyIx = (oracle: PublicKey) =>
    methods(program)
      .buy(u64(qty), u64(maxCost))
      .accounts({
        buyer: buyer.publicKey,
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
    const ix = await buyIx(findDemoOracle(config.programId, vault.address))
    return send(config, buyer, [...setup, ix], [], "buy")
  }
  if (series.oracleKind !== ORACLE_PYTH) {
    throw new Error(`unknown oracle kind ${series.oracleKind}`)
  }
  const { fetchLatestPrice } = await import("./pyth.js")
  const update = await fetchLatestPrice(config.feedId, config.pythApiKey)
  if (setup.length) {
    await send(config, buyer, setup, [], "buy_accounts")
  }
  await sendPythConsumer(config, buyer, update, buyIx, "buy_pyth")
  return "pyth-buy"
}

export const settleSeries = async (
  config: KeeperConfig,
  payer: Keypair,
  vault: VaultView,
  series: SeriesView,
): Promise<void> => {
  const program = programFor(config, payer)
  const settleIx = (oracle: PublicKey) =>
    methods(program)
      .settle()
      .accounts({
        payer: payer.publicKey,
        vault: vault.address,
        series: series.address,
        oracle,
      })
      .instruction()
  if (series.oracleKind === ORACLE_DEMO) {
    await send(
      config,
      payer,
      [await settleIx(findDemoOracle(config.programId, vault.address))],
      [],
      "settle",
    )
    return
  }
  const update = await fetchSettleUpdate(
    config.feedId,
    series.expiry,
    config.file.vault.settle_window_s,
    config.pythApiKey,
  )
  if (!update) {
    log("settle_skip", {
      series: series.address.toBase58(),
      reason: config.pythApiKey ? "no hermes price in window" : "PYTH_API_KEY is not set",
    })
    return
  }
  await sendPythConsumer(config, payer, update, settleIx, "settle_pyth")
}

const holderAmount = (data: Buffer): { owner: PublicKey; amount: bigint } | null => {
  if (data.length < 72) {
    return null
  }
  return {
    owner: new PublicKey(data.subarray(32, 64)),
    amount: data.readBigUInt64LE(64),
  }
}

export const exerciseSeries = async (
  config: KeeperConfig,
  crank: Keypair,
  vault: VaultView,
  series: SeriesView,
): Promise<void> => {
  const connection = getConnection(config)
  const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    commitment: "confirmed",
    filters: [{ memcmp: { offset: 0, bytes: series.optionMint.toBase58() } }],
  })
  const holders = accounts.flatMap((account) => {
    const parsed = holderAmount(Buffer.from(account.account.data))
    if (!parsed || parsed.amount === 0n) {
      return []
    }
    return [{ options: account.pubkey, owner: parsed.owner }]
  })
  const batchSize = config.file.keeper.exercise_batch
  for (let index = 0; index < holders.length; index += batchSize) {
    const batch = holders.slice(index, index + batchSize)
    const ixs: TransactionInstruction[] = []
    const program = programFor(config, crank)
    for (const holder of batch) {
      const holderUsdc = getAssociatedTokenAddressSync(
        vault.usdcMint,
        holder.owner,
        false,
        TOKEN_PROGRAM_ID,
      )
      ixs.push(
        createAssociatedTokenAccountIdempotentInstruction(
          crank.publicKey,
          holderUsdc,
          holder.owner,
          vault.usdcMint,
          TOKEN_PROGRAM_ID,
        ),
      )
      ixs.push(
        await methods(program)
          .exercise()
          .accounts({
            crank: crank.publicKey,
            vault: vault.address,
            series: series.address,
            optionMint: series.optionMint,
            holderOptions: holder.options,
            holder: holder.owner,
            holderUsdc,
            usdcVault: vault.usdcVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            token2022Program: TOKEN_2022_PROGRAM_ID,
          })
          .instruction(),
      )
    }
    try {
      await send(config, crank, ixs, [], "exercise")
    } catch (error) {
      logError("exercise_batch_retry", error, { series: series.address.toBase58() })
      for (let inner = 0; inner < ixs.length; inner += 2) {
        const pair = ixs.slice(inner, inner + 2)
        try {
          await send(config, crank, pair, [], "exercise_one")
        } catch (oneError) {
          logError("exercise_skip", oneError, { series: series.address.toBase58() })
        }
      }
    }
  }
}

export const settleAndExercise = async (
  config: KeeperConfig,
  crank: Keypair,
  vault: VaultView,
  series: SeriesView,
): Promise<void> => {
  if (!series.settled) {
    try {
      await settleSeries(config, crank, vault, series)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes("AlreadySettled")) {
        throw error
      }
    }
  }
  let current = (await fetchSeries(config, crank, series.address)) ?? series
  let guard = 0
  while (current.settled && current.openInterest > 0n && guard < 40) {
    await exerciseSeries(config, crank, vault, current)
    const next = await fetchSeries(config, crank, series.address)
    if (!next || next.openInterest >= current.openInterest) {
      break
    }
    current = next
    guard += 1
  }
}
