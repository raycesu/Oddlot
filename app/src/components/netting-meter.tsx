"use client"

import type { BookSeriesRow } from "@/lib/api"
import { appConfig } from "@/lib/config"
import { cn } from "@/lib/utils"

type NettingMeterProps = {
  rows: BookSeriesRow[]
}

export const NettingMeter = ({ rows }: NettingMeterProps) => {
  if (!rows.length) {
    return <p className="text-sm text-muted">No open interest to net yet.</p>
  }

  return (
    <ul className="space-y-4" data-testid="netting-meter">
      {rows.map((row) => {
        const residual = row.residual % appConfig.roundLot
        const pct = Math.min(100, (residual / appConfig.roundLot) * 100)
        return (
          <li key={row.series} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-ink">{row.series}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                lots printed: {row.lots_hedged}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-line">
              <div
                className={cn("h-full rounded bg-teal transition-all", residual === 0 && row.open_interest > 0 && "bg-ok")}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={residual}
                aria-valuemin={0}
                aria-valuemax={appConfig.roundLot}
                aria-label={`Netting progress for ${row.series}`}
              />
            </div>
            <p className="font-mono text-xs text-muted">
              OI {row.open_interest} · residual {residual}/{appConfig.roundLot}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
