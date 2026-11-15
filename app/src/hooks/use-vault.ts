"use client"

import { useConnection } from "@solana/wallet-adapter-react"
import { useCallback, useEffect, useState } from "react"

import { createReadonlyProgram, fetchVaultView } from "@/lib/program"
import type { VaultView } from "@/lib/pdas"
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token"

export type VaultState = {
  vault: VaultView | null
  usdcHeld: bigint
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export const useVault = (): VaultState => {
  const { connection } = useConnection()
  const [vault, setVault] = useState<VaultView | null>(null)
  const [usdcHeld, setUsdcHeld] = useState(0n)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const program = createReadonlyProgram(connection)
      const next = await fetchVaultView(program)
      setVault(next)
      if (next) {
        const account = await getAccount(connection, next.usdcVault, "confirmed", TOKEN_PROGRAM_ID)
        setUsdcHeld(account.amount)
      } else {
        setUsdcHeld(0n)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vault")
    } finally {
      setIsLoading(false)
    }
  }, [connection])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void refresh()
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return { vault, usdcHeld, isLoading, error, refresh }
}
