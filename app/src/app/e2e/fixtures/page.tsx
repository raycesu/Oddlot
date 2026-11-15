"use client"

import { FaucetButton } from "@/components/faucet-button"
import { WalletGate } from "@/components/wallet-gate"

/**
 * Static fixtures for Playwright smoke — mocked wallet states without Phantom.
 * Not linked from the main nav.
 */
const FixturesPage = () => (
  <div className="space-y-8" data-testid="e2e-fixtures">
    <section data-testid="fixture-no-usdc">
      <h2 className="mb-2 font-display text-xl">No USDC</h2>
      <div
        className="rounded-lg border border-line bg-surface px-4 py-8 text-center"
        data-testid="no-usdc"
      >
        <p className="mb-1 text-ink">You need test USDC</p>
        <p className="mb-4 text-sm text-muted">Balance $0.00. Request 1,000 test USDC from the faucet.</p>
        <FaucetButton />
      </div>
    </section>

    <section data-testid="fixture-market-closed">
      <h2 className="mb-2 font-display text-xl">Market closed</h2>
      <div className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-warn">
        Market closed. Sales resume at 9:30 AM ET.
      </div>
    </section>

    <section data-testid="fixture-loading">
      <h2 className="mb-2 font-display text-xl">Loading</h2>
      <WalletGate usdcBalance={0n} isLoading>
        <p>hidden</p>
      </WalletGate>
    </section>

    <section data-testid="fixture-loaded">
      <h2 className="mb-2 font-display text-xl">Loaded</h2>
      <p>Loaded buy form ready</p>
    </section>
  </div>
)

export default FixturesPage
