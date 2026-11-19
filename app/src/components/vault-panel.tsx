"use client"

import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { CrowdChart, GeminiInfo } from "@/components/crowd-chart"
import { NettingMeter } from "@/components/netting-meter"
import { TradeTape } from "@/components/trade-tape"
import { Button } from "@/components/ui/button"
import type { BookResponse, DistributionResponse, TradesResponse } from "@/lib/api"
import { explorerTxUrl } from "@/lib/config"
import { mapProgramError } from "@/lib/errors"
import { formatDollars, formatShares } from "@/lib/format"
import { depositUsdc, withdrawShares } from "@/lib/lp"
import { USD, usdTo1e6 } from "@/lib/money"
import type { VaultView } from "@/lib/pdas"

type VaultPanelProps = {
  vault: VaultView | null
  usdcHeld: bigint
  book: BookResponse | null
  trades: TradesResponse | null
  distribution: DistributionResponse | null
  spot: number
  isLoading: boolean
  onRefresh: () => Promise<void>
}

export const VaultPanel = ({
  vault,
  usdcHeld,
  book,
  trades,
  distribution,
  spot,
  isLoading,
  onRefresh,
}: VaultPanelProps) => {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const { connected } = useWallet()
  const [depositAmount, setDepositAmount] = useState("100")
  const [withdrawAmount, setWithdrawAmount] = useState("10")
  const [lpShares, setLpShares] = useState(0n)
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!wallet || !vault) {
        setLpShares(0n)
        return
      }
      try {
        const ata = getAssociatedTokenAddressSync(vault.lpMint, wallet.publicKey, false, TOKEN_PROGRAM_ID)
        const account = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID)
        setLpShares(account.amount)
      } catch {
        setLpShares(0n)
      }
    }
    void load()
  }, [connection, wallet, vault, usdcHeld])

  const coverage =
    vault && vault.totalLocked > 0n
      ? Number(usdcHeld) / Number(vault.totalLocked)
      : usdcHeld > 0n
        ? Number.POSITIVE_INFINITY
        : 0

  const handleDeposit = async () => {
    if (!wallet || !vault) {
      return
    }
    setIsWorking(true)
    try {
      const amount = usdTo1e6(depositAmount)
      const signature = await depositUsdc({ connection, wallet, vault, amount })
      toast.success("Deposited", {
        action: {
          label: "Explorer",
          onClick: () => window.open(explorerTxUrl(signature), "_blank"),
        },
      })
      await onRefresh()
    } catch (err) {
      toast.error(mapProgramError(err))
    } finally {
      setIsWorking(false)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet || !vault) {
      return
    }
    setIsWorking(true)
    try {
      const shares = usdTo1e6(withdrawAmount)
      const signature = await withdrawShares({ connection, wallet, vault, shares })
      toast.success("Withdrew", {
        action: {
          label: "Explorer",
          onClick: () => window.open(explorerTxUrl(signature), "_blank"),
        },
      })
      await onRefresh()
    } catch (err) {
      toast.error(mapProgramError(err))
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="loading-skeletons" aria-busy="true">
        <div className="h-24 animate-pulse rounded-md bg-line/50" />
        <div className="h-32 animate-pulse rounded-md bg-line/40" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3" data-testid="solvency-panel">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">USDC held</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink">{formatDollars(usdcHeld)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Max payout owed</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink">
            {formatDollars(vault?.totalLocked ?? 0n)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Coverage</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ok">
            {coverage === Number.POSITIVE_INFINITY
              ? "∞"
              : `${(coverage * 100).toFixed(1)}%`}
          </p>
          <p className="text-xs text-muted">always ≥ 100% when open interest is backed</p>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-xl font-medium tracking-tight text-ink">LP deposit / withdraw</h2>
        {!connected ? (
          <p className="text-sm text-muted" data-testid="wallet-disconnected">
            Connect a wallet to deposit
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Your LP shares:{" "}
              <span className="font-mono tabular-nums text-ink">{formatShares(lpShares / USD)}</span>
              <span className="text-xs"> (raw {lpShares.toString()})</span>
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Deposit USDC</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  className="h-10 w-36 rounded-md border border-line px-3 font-mono"
                  aria-label="Deposit amount"
                />
              </label>
              <Button
                type="button"
                variant="teal"
                disabled={!vault || isWorking}
                onClick={() => void handleDeposit()}
                data-testid="deposit-button"
              >
                Deposit
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Withdraw shares (USD units)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  className="h-10 w-36 rounded-md border border-line px-3 font-mono"
                  aria-label="Withdraw shares"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={!vault || isWorking || lpShares === 0n}
                onClick={() => void handleWithdraw()}
                data-testid="withdraw-button"
              >
                Withdraw
              </Button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-medium tracking-tight text-ink">Netting meter</h2>
        <NettingMeter rows={book?.series ?? []} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-medium tracking-tight text-ink">Gemini vs Wall Street</h2>
          <GeminiInfo />
          {distribution?.event ? (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              {distribution.event}
            </span>
          ) : null}
        </div>
        <CrowdChart
          buckets={distribution?.buckets ?? []}
          spot={spot}
          ratio={Number.parseFloat(distribution?.r ?? "") || 0}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-medium tracking-tight text-ink">Trade tape</h2>
        <TradeTape trades={trades?.trades ?? []} />
      </section>
    </div>
  )
}
