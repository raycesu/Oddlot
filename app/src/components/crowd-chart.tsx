"use client"

import type { DistributionResponse } from "@/lib/api"

type CrowdChartProps = {
  buckets: DistributionResponse["buckets"]
}

const widthOf = (value: string, max: number): number => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || max <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, (parsed / max) * 100))
}

export const CrowdChart = ({ buckets }: CrowdChartProps) => {
  if (!buckets.length) {
    return (
      <p className="text-sm text-muted" data-testid="crowd-chart">
        No crowd distribution yet.
      </p>
    )
  }
  const max = Math.max(
    0.01,
    ...buckets.flatMap((bucket) => [
      Number.parseFloat(bucket.crowd_prob) || 0,
      Number.parseFloat(bucket.bs_prob) || 0,
    ]),
  )

  return (
    <div className="space-y-3" data-testid="crowd-chart">
      <div className="flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 bg-teal" /> Crowd
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 bg-ink/40" /> Wall Street
        </span>
      </div>
      <ul className="space-y-3">
        {buckets.map((bucket) => (
          <li key={bucket.label}>
            <p className="mb-1 text-xs text-slate">{bucket.label}</p>
            <svg viewBox="0 0 100 14" className="h-4 w-full" role="img" aria-label={bucket.label}>
              <rect
                x="0"
                y="0"
                height="6"
                width={widthOf(bucket.crowd_prob, max)}
                className="fill-teal"
              />
              <rect
                x="0"
                y="8"
                height="6"
                width={widthOf(bucket.bs_prob, max)}
                className="fill-ink/40"
              />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  )
}
