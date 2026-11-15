import { PublicKey, SystemProgram, type TransactionInstruction } from "@solana/web3.js"

/** Browser stub — @pythnetwork/solana-utils imports jito for tip routing; Oddlot does not use it. */

export const TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiUK5CezAPCchDu1HyUyA",
]

export const getRandomTipAccount = (): PublicKey => new PublicKey(TIP_ACCOUNTS[0])

export const buildJitoTipInstruction = (payer: PublicKey, lamports: number): TransactionInstruction =>
  SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: getRandomTipAccount(),
    lamports,
  })

export const sendTransactionsJito = async (): Promise<string> => {
  throw new Error("Jito tips are not used in the Oddlot web app")
}
