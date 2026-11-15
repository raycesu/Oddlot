"use client"

import { ProtectForm } from "@/components/protect-form"
import { usePricer } from "@/hooks/use-pricer"
import { useSeries } from "@/hooks/use-series"
import { useVault } from "@/hooks/use-vault"

const ProtectPage = () => {
  const pricer = usePricer()
  const seriesState = useSeries()
  const vaultState = useVault()
  const spot = Number.parseFloat(pricer.quotes?.spot ?? "0") || 0

  const handleRefresh = async () => {
    await Promise.all([seriesState.refresh(), vaultState.refresh()])
  }

  return (
    <div data-testid="protect-page">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Put options</h1>
        <p className="mt-1 text-slate">
          Exact-share puts for advisors — cover 44 shares in one transaction.
        </p>
      </div>
      {pricer.error ? <p className="mb-4 text-sm text-danger">{pricer.error}</p> : null}
      <ProtectForm
        series={seriesState.series}
        spot={spot}
        vault={vaultState.vault}
        usdcBalance={seriesState.usdcBalance}
        isLoading={seriesState.isLoading || vaultState.isLoading}
        onRefresh={handleRefresh}
      />
    </div>
  )
}

export default ProtectPage
