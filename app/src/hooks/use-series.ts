"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import {
  AccountLayout,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
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

const isRateLimited = (err: unknown): boolean => {
  const text = err instanceof Error ? err.message : String(err)
  return /429|Too Many Requests|rate.?limit/i.test(text)
}

const amountFromAccountData = (data: Buffer): bigint => {
  const decoded = AccountLayout.decode(data)
  return BigInt(decoded.amount.toString())
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

      if (!publicKey) {
        setUsdcBalance(0n)
        setHoldings([])
        setError(null)
        return
      }

      const usdcAta = getAssociatedTokenAddressSync(
        new PublicKey(appConfig.usdcMint),
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
      )
      const optionAtas = live.map((row) =>
        getAssociatedTokenAddressSync(row.optionMint, publicKey, false, TOKEN_2022_PROGRAM_ID),
      )

      // One batched RPC instead of 1 + N getAccount calls (public RPC 429s otherwise).
      const infos = await connection.getMultipleAccountsInfo([usdcAta, ...optionAtas], "confirmed")
      const usdcInfo = infos[0]
      if (usdcInfo) {
        setUsdcBalance(amountFromAccountData(Buffer.from(usdcInfo.data)))
      } else {
        setUsdcBalance(0n)
      }

      const nextHoldings: TokenHolding[] = []
      for (let index = 0; index < live.length; index += 1) {
        const info = infos[index + 1]
        if (!info) {
          continue
        }
        const balance = amountFromAccountData(Buffer.from(info.data))
        if (balance > 0n) {
          nextHoldings.push({ series: live[index], balance })
        }
      }
      setHoldings(nextHoldings)
      setError(null)
    } catch (err) {
      if (isRateLimited(err)) {
        // Keep last known USDC so WalletGate does not flash a fake faucet prompt.
        setError("RPC rate limited (429). Retrying — keep one tab open.")
        return
      }
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

/** Sales stop `buyCutoffS` seconds before expiry (matches on-chain buy). */
export const isBuyWindowOpen = (row: SeriesView, nowSeconds = Math.floor(Date.now() / 1000)): boolean => {
  if (row.settled) {
    return false
  }
  const cutoff = Number(row.expiry) - row.buyCutoffS
  return nowSeconds < cutoff
}

/** On-chain vault quote_max_age_s is 60; refuse stale quotes before wallet popup. */
export const isQuoteFresh = (
  row: SeriesView,
  maxAgeS = 45,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean => {
  if (row.quoteTs <= 0n) {
    return false
  }
  return nowSeconds - Number(row.quoteTs) <= maxAgeS
}
