"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import type { ReactNode } from "react"

import { FaucetButton } from "@/components/faucet-button"
import { formatDollars } from "@/lib/format"
import { USD } from "@/lib/money"

type WalletGateProps = {
  usdcBalance: bigint
  isLoading?: boolean
  onFunded?: () => void
  children: ReactNode
}

export const WalletGate = ({ usdcBalance, isLoading, onFunded, children }: WalletGateProps) => {
  const { connected } = useWallet()

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="loading-skeletons" aria-busy="true">
        <div className="h-10 animate-pulse rounded-md bg-line/60" />
        <div className="h-24 animate-pulse rounded-md bg-line/40" />
        <div className="h-10 animate-pulse rounded-md bg-line/50" />
      </div>
    )
  }

  if (!connected) {
    return (
      <div
        className="panel panel-dashed px-4 py-8 text-center"
        data-testid="wallet-disconnected"
      >
        <p className="text-slate">Connect a wallet to buy</p>
      </div>
    )
  }

  if (usdcBalance < USD) {
    return (
      <div
        className="panel px-4 py-8 text-center"
        data-testid="no-usdc"
      >
        <p className="mb-1 text-ink">You need test USDC</p>
        <p className="mb-4 text-sm text-muted">
          Balance {formatDollars(usdcBalance)}. Request 1,000 test USDC from the faucet.
        </p>
        <FaucetButton onFunded={onFunded} />
      </div>
    )
  }

  return <>{children}</>
}
