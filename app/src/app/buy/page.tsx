"use client"

import { BuyForm } from "@/components/buy-form"
import { usePricer } from "@/hooks/use-pricer"
import { useSeries } from "@/hooks/use-series"
import { useVault } from "@/hooks/use-vault"

const BuyPage = () => {
  const pricer = usePricer()
  const seriesState = useSeries()
  const vaultState = useVault()

  const handleRefresh = async () => {
    await Promise.all([seriesState.refresh(), vaultState.refresh()])
  }

  return (
    <div data-testid="buy-page">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Call options</h1>
        <p className="mt-1 text-slate">One-share SPY calls. On-chain premium is what you pay.</p>
      </div>
      {pricer.error ? <p className="mb-4 text-sm text-danger">{pricer.error}</p> : null}
      <BuyForm
        series={seriesState.series}
        quotes={pricer.quotes?.quotes ?? []}
        vault={vaultState.vault}
        usdcBalance={seriesState.usdcBalance}
        holdings={seriesState.holdings}
        isLoading={seriesState.isLoading || vaultState.isLoading}
        onRefresh={handleRefresh}
      />
    </div>
  )
}

export default BuyPage
