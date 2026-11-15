"use client"

import type { TokenHolding } from "@/hooks/use-series"
import { formatShares, seriesLabel, shortPremium } from "@/lib/format"

type TokenListProps = {
  holdings: TokenHolding[]
}

export const TokenList = ({ holdings }: TokenListProps) => {
  if (!holdings.length) {
    return (
      <p className="text-sm text-muted" data-testid="token-list-empty">
        No option tokens in this wallet yet.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface" data-testid="token-list">
      {holdings.map((row) => (
        <li key={row.series.address.toBase58()} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">{seriesLabel(row.series)}</p>
            <p className="font-mono text-xs text-muted">
              premium {shortPremium(row.series.premium)}
            </p>
          </div>
          <p className="font-mono text-sm tabular-nums text-ink">{formatShares(row.balance)}</p>
        </li>
      ))}
    </ul>
  )
}
