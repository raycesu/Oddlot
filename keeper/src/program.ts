import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor"
import { Connection, Keypair } from "@solana/web3.js"

import idl from "../../idl/oddlot.json" with { type: "json" }

import type { KeeperConfig } from "./config.js"

let connection: Connection | undefined

export const getConnection = (config: KeeperConfig): Connection => {
  if (!connection) {
    connection = new Connection(config.rpcUrl, "confirmed")
  }
  return connection
}

export const programFor = (config: KeeperConfig, signer: Keypair): Program => {
  const conn = getConnection(config)
  const provider = new AnchorProvider(conn, new Wallet(signer), { commitment: "confirmed" })
  return new Program(idl as never, provider)
}
