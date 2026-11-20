"use client"

import { VaultPanel } from "@/components/vault-panel"
import { usePricer } from "@/hooks/use-pricer"
import { useVault } from "@/hooks/use-vault"

const VaultPage = () => {
  const pricer = usePricer()
  const vaultState = useVault()

  return (
    <div data-testid="vault-page">
      <div className="mb-6">
        <h1 className="text-3xl font-medium tracking-tight text-ink">Vault</h1>
        <p className="mt-1 text-slate">Solvency, LP capital, netting, and the trade tape.</p>
      </div>
      {pricer.error ? <p className="mb-4 text-sm text-danger">{pricer.error}</p> : null}
      <VaultPanel
        vault={vaultState.vault}
        usdcHeld={vaultState.usdcHeld}
        book={pricer.book}
        trades={pricer.trades}
        distribution={pricer.distribution}
        spot={Number.parseFloat(pricer.quotes?.spot ?? "") || 0}
        isLoading={vaultState.isLoading && pricer.isLoading}
        onRefresh={vaultState.refresh}
      />
    </div>
  )
}

export default VaultPage
