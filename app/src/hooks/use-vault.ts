"use client"

import { useCallback, useState } from "react"

import { createReadConnection, createReadonlyProgram, fetchVaultView } from "@/lib/program"
import type { VaultView } from "@/lib/pdas"
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token"

import { useVisibilityPoll } from "./use-visibility-poll"

export type VaultState = {
  vault: VaultView | null
  usdcHeld: bigint
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export const useVault = (): VaultState => {
  const [vault, setVault] = useState<VaultView | null>(null)
  const [usdcHeld, setUsdcHeld] = useState(0n)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const connection = createReadConnection()
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
  }, [])

  useVisibilityPoll(refresh)

  return { vault, usdcHeld, isLoading, error, refresh }
}
