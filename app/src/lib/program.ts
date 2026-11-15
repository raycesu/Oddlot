import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor"
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"

import idlJson from "@/data/oddlot.json"
import type { AppWallet } from "./buy"
import { appConfig } from "./config"
import { findVault, readSeries, readVault, type SeriesView, type VaultView } from "./pdas"

export const getProgramId = (): PublicKey => new PublicKey(appConfig.programId)

export const createConnection = (): Connection =>
  new Connection(appConfig.rpcUrl, "confirmed")

let readConnection: Connection | null = null

/** Shared Connection for series/vault polling (separate from wallet send RPC). */
export const createReadConnection = (): Connection => {
  if (readConnection) {
    return readConnection
  }
  readConnection = new Connection(appConfig.readRpcUrl, "confirmed")
  return readConnection
}

export const createProgram = (connection: Connection, wallet: AppWallet): Program => {
  const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" })
  return new Program(idlJson as Idl, provider)
}

type AccountCoder = {
  fetchNullable: (address: PublicKey) => Promise<Record<string, unknown> | null>
  all: () => Promise<{ publicKey: PublicKey; account: Record<string, unknown> }[]>
}

const accountsOf = (program: Program) =>
  program.account as unknown as Record<string, AccountCoder>

export const fetchVaultView = async (program: Program): Promise<VaultView | null> => {
  const address = findVault(getProgramId())
  const account = await accountsOf(program).vault.fetchNullable(address)
  return account ? readVault(address, account) : null
}

export const listSeriesViews = async (program: Program): Promise<SeriesView[]> => {
  const rows = await accountsOf(program).series.all()
  return rows.map((row) => readSeries(row.publicKey, row.account))
}

export const fetchSeriesView = async (
  program: Program,
  address: PublicKey,
): Promise<SeriesView | null> => {
  const account = await accountsOf(program).series.fetchNullable(address)
  return account ? readSeries(address, account) : null
}

/** Read-only program using a dummy wallet (no signing). */
export const createReadonlyProgram = (connection: Connection): Program => {
  const wallet: AppWallet = {
    publicKey: PublicKey.default,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs,
  }
  return createProgram(connection, wallet)
}
