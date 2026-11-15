"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import { useCallback, useState } from "react"

import { appConfig } from "@/lib/config"
import { KIND_CALL, ORACLE_DEMO, ORACLE_PYTH, type SeriesView } from "@/lib/pdas"
import { createReadConnection, createReadonlyProgram, listSeriesViews } from "@/lib/program"

import { useVisibilityPoll } from "./use-visibility-poll"

export type TokenHolding = {
  series: SeriesView
  balance: bigint
}

export type SeriesState = {
  series: SeriesView[]
  holdings: TokenHolding[]
  usdcBalance: bigint
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export const useSeries = (): SeriesState => {
  const { publicKey } = useWallet()
  const [series, setSeries] = useState<SeriesView[]>([])
  const [holdings, setHoldings] = useState<TokenHolding[]>([])
  const [usdcBalance, setUsdcBalance] = useState(0n)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const connection = createReadConnection()
      const program = createReadonlyProgram(connection)
      const rows = await listSeriesViews(program)
      const live = rows.filter((row) => !row.settled)
      setSeries(live)

      if (publicKey) {
        const usdcAta = getAssociatedTokenAddressSync(
          new PublicKey(appConfig.usdcMint),
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
        )
        try {
          const usdc = await getAccount(connection, usdcAta, "confirmed", TOKEN_PROGRAM_ID)
          setUsdcBalance(usdc.amount)
        } catch {
          setUsdcBalance(0n)
        }

        const nextHoldings: TokenHolding[] = []
        for (const row of live) {
          const ata = getAssociatedTokenAddressSync(
            row.optionMint,
            publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
          )
          try {
            const account = await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID)
            if (account.amount > 0n) {
              nextHoldings.push({ series: row, balance: account.amount })
            }
          } catch {
            // no ATA
          }
        }
        setHoldings(nextHoldings)
      } else {
        setUsdcBalance(0n)
        setHoldings([])
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load series")
    } finally {
      setIsLoading(false)
    }
  }, [publicKey])

  useVisibilityPoll(refresh)

  return { series, holdings, usdcBalance, isLoading, error, refresh }
}

export const isDemoSeries = (row: SeriesView): boolean => row.oracleKind === ORACLE_DEMO
export const isYearEndSeries = (row: SeriesView): boolean => row.oracleKind === ORACLE_PYTH
export const isCall = (row: SeriesView): boolean => row.kind === KIND_CALL
