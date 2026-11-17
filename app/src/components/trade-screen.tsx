"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { BuyForm } from "@/components/buy-form"
import { ProtectForm } from "@/components/protect-form"
import { usePricer } from "@/hooks/use-pricer"
import { useSeries } from "@/hooks/use-series"
import { useVault } from "@/hooks/use-vault"
import { appConfig } from "@/lib/config"
import { cn } from "@/lib/utils"

export type TradeSide = "call" | "put"

type TradeScreenProps = {
  initialSide: TradeSide
}

export const TradeScreen = ({ initialSide }: TradeScreenProps) => {
  const router = useRouter()
  const pricer = usePricer()
  const seriesState = useSeries()
  const vaultState = useVault()
  const [side, setSide] = useState<TradeSide>(initialSide)
  const spot = Number.parseFloat(pricer.quotes?.spot ?? "0") || 0

  useEffect(() => {
    setSide(initialSide)
  }, [initialSide])

  const handleRefresh = async () => {
    await Promise.all([seriesState.refresh(), vaultState.refresh()])
  }

  const selectSide = (next: TradeSide) => {
    setSide(next)
    router.replace(next === "call" ? "/trade?side=call" : "/trade?side=put")
  }

  return (
    <div data-testid={side === "call" ? "buy-page" : "protect-page"}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-ink">Trade</h1>
          <p className="mt-1 text-slate">
            {side === "call"
              ? `One-share ${appConfig.underlying} calls. On-chain premium is what you pay.`
              : "Exact-share puts for advisors — cover 44 shares in one transaction."}
          </p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Option side">
          {(["put", "call"] as TradeSide[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={side === item}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium capitalize",
                side === item ? "halo-blue" : "rounded-full border border-line bg-surface text-slate",
              )}
              onClick={() => selectSide(item)}
            >
              {item === "call" ? "Calls" : "Puts"}
            </button>
          ))}
        </div>
      </div>
      {pricer.error ? <p className="mb-4 text-sm text-danger">{pricer.error}</p> : null}
      {seriesState.error ? <p className="mb-4 text-sm text-danger">{seriesState.error}</p> : null}
      {side === "call" ? (
        <BuyForm
          series={seriesState.series}
          quotes={pricer.quotes?.quotes ?? []}
          vault={vaultState.vault}
          usdcBalance={seriesState.usdcBalance}
          holdings={seriesState.holdings}
          isLoading={seriesState.isLoading || vaultState.isLoading}
          onRefresh={handleRefresh}
        />
      ) : (
        <ProtectForm
          series={seriesState.series}
          spot={spot}
          vault={vaultState.vault}
          usdcBalance={seriesState.usdcBalance}
          holdings={seriesState.holdings}
          isLoading={seriesState.isLoading || vaultState.isLoading}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
