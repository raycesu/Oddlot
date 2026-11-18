"use client"

import type { SimulationResponse } from "@/lib/api"
import { formatDollars } from "@/lib/format"

type PnlSimProps = {
  simulation: SimulationResponse | null
}

const LABELS: Record<SimulationResponse["strategies"][number]["id"], string> = {
  unhedged: "No hedge",
  delta: "Delta only",
  lots_delta: "Lots + delta",
  lots_gemini: "Lots + Gemini",
}

export const PnlSim = ({ simulation }: PnlSimProps) => {
  const strategies = simulation?.strategies ?? []
  if (!strategies.length) {
    return (
      <p className="text-sm text-muted" data-testid="pnl-sim">
        Simulation unavailable.
      </p>
    )
  }
  const peak = Math.max(
    1,
    ...strategies.map((row) => Math.abs(Number.parseFloat(row.mean_pnl) || 0)),
  )

  return (
    <div className="space-y-3" data-testid="pnl-sim">
      <ul className="space-y-3">
        {strategies.map((row) => {
          const mean = Number.parseFloat(row.mean_pnl) || 0
          const width = Math.max(0, Math.min(100, (Math.abs(mean) / peak) * 100))
          return (
            <li key={row.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-slate">{LABELS[row.id]}</span>
                <span className="font-mono tabular-nums text-ink">{formatDollars(row.mean_pnl)}</span>
              </div>
              <svg viewBox="0 0 100 8" className="h-2 w-full" role="img" aria-label={LABELS[row.id]}>
                <rect x="0" y="0" width="100" height="8" className="fill-line/40" />
                <rect
                  x="0"
                  y="0"
                  width={width}
                  height="8"
                  className={mean >= 0 ? "fill-teal" : "fill-danger"}
                />
              </svg>
              <p className="mt-1 text-xs text-muted">
                {formatDollars(row.p05)} to {formatDollars(row.p95)}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
