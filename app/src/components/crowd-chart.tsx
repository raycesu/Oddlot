"use client"

import { Info } from "lucide-react"

import type { DistributionResponse } from "@/lib/api"

type Bucket = DistributionResponse["buckets"][number]

type CrowdChartProps = {
  buckets: Bucket[]
  spot: number
  ratio: number
}

const INFO_COPY =
  "Gemini’s SPX year-end market is the crowd. Each percentage is that bucket’s share of Gemini’s prices. Wall Street is the Black–Scholes chance for the same slice. The option premium uses whichever is higher, plus the 3% spread."

const percentLabel = (value: string): string => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    return "—"
  }
  return `${Math.round(parsed * 100)}%`
}

const parseNumber = (raw: string): number => Number.parseFloat(raw.replace(/,/g, ""))

const containsSpot = (label: string, spot: number, ratio: number): boolean => {
  if (!(spot > 0) || !(ratio > 0)) {
    return false
  }
  const text = label.trim()
  const range = text.match(/^([\d,]+(?:\.\d+)?)\s+to\s+([\d,]+(?:\.\d+)?)$/i)
  if (range) {
    const low = parseNumber(range[1]) * ratio
    const high = parseNumber(range[2]) * ratio
    return spot >= low && spot <= high
  }
  const below = text.match(/^([\d,]+(?:\.\d+)?)\s+or\s+below$/i)
  if (below) {
    return spot <= parseNumber(below[1]) * ratio
  }
  const above = text.match(/^([\d,]+(?:\.\d+)?)\s+or\s+above$/i)
  if (above) {
    return spot >= parseNumber(above[1]) * ratio
  }
  return false
}

export const GeminiInfo = () => (
  <span className="relative inline-flex">
    <button
      type="button"
      className="peer inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
      aria-label="About Gemini vs Wall Street"
    >
      <Info className="h-4 w-4" aria-hidden />
    </button>
    <span
      role="tooltip"
      className="pointer-events-none absolute top-8 left-0 z-20 hidden w-72 rounded-md border border-line bg-surface p-3 text-left text-xs leading-relaxed text-slate shadow-sm peer-hover:block peer-focus:block"
    >
      {INFO_COPY}
    </span>
  </span>
)

const OutcomeRow = ({
  bucket,
  spotHere,
}: {
  bucket: Bucket
  spotHere: boolean
}) => {
  const gemini = percentLabel(bucket.crowd_prob)
  const wallStreet = percentLabel(bucket.bs_prob)
  const width = Math.max(0, Math.min(100, Number.parseFloat(bucket.crowd_prob) * 100 || 0))

  return (
    <li className="group relative rounded-md outline-none focus-within:bg-paper" tabIndex={0}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink">
          {bucket.label}
          {spotHere ? (
            <span className="ml-2 rounded-full bg-teal-soft px-2 py-0.5 text-xs font-medium text-teal">
              Spot
            </span>
          ) : null}
        </p>
        <p className="font-mono text-lg tabular-nums text-ink">{gemini}</p>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/50">
        <div className="h-full rounded-full bg-teal" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">Wall Street {wallStreet}</p>
      <div className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden w-full max-w-sm rounded-md border border-line bg-surface p-3 text-xs text-slate shadow-sm group-hover:block group-focus:block">
        <p>
          Gemini {gemini} · Wall Street {wallStreet}
        </p>
        <p className="mt-1">
          Bid {bucket.bid ?? "—"} · Ask {bucket.ask ?? "—"}
        </p>
        <p className="mt-1">SPY midpoint ${bucket.spy_mid}</p>
        {spotHere ? <p className="mt-1 text-ink">Today&apos;s price is in this bucket.</p> : null}
      </div>
    </li>
  )
}

export const CrowdChart = ({ buckets, spot, ratio }: CrowdChartProps) => {
  if (!buckets.length) {
    return (
      <p className="text-sm text-muted" data-testid="crowd-chart">
        No crowd distribution yet.
      </p>
    )
  }

  return (
    <ul className="space-y-4" data-testid="crowd-chart">
      {buckets.map((bucket) => (
        <OutcomeRow
          key={bucket.label}
          bucket={bucket}
          spotHere={containsSpot(bucket.label, spot, ratio)}
        />
      ))}
    </ul>
  )
}
