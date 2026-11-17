"use client"

import type { TradeRow } from "@/lib/api"
import { formatDollars, formatEt, formatShares } from "@/lib/format"

type TradeTapeProps = {
  trades: TradeRow[]
}

export const TradeTape = ({ trades }: TradeTapeProps) => {
  const rows = trades.slice(0, 20)
  if (!rows.length) {
    return <p className="text-sm text-muted">No trades yet.</p>
  }

  return (
    <div className="overflow-x-auto panel" data-testid="trade-tape">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Series</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((trade) => (
            <tr key={trade.signature} className="border-b border-line/70 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted">
                {formatEt(trade.ts)}
              </td>
              <td className="px-3 py-2 text-ink">
                {trade.series}{" "}
                <span className="text-muted">{trade.kind}</span>
              </td>
              <td className="px-3 py-2 font-mono tabular-nums">{formatShares(trade.qty)}</td>
              <td className="px-3 py-2 font-mono tabular-nums">{formatDollars(trade.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
