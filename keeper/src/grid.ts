import { USD, roundHalfEven } from "./money.js"

export type GridConfig = {
  strikeStep: number
  strikeBandPct: number
  widths: number[]
  kinds: string[]
}

export type GridLeg = {
  kind: "call" | "put"
  kindCode: number
  strike: bigint
  width: bigint
}

export const yearEndStrikes = (
  spot1e6: bigint,
  stepDollars: number,
  bandPct: number,
): bigint[] => {
  const step = BigInt(stepDollars) * USD
  const band = BigInt(bandPct)
  const low = roundHalfEven((spot1e6 * (100n - band)) / 100n, step) * step
  const high = roundHalfEven((spot1e6 * (100n + band)) / 100n, step) * step
  const strikes: bigint[] = []
  for (let strike = low; strike <= high; strike += step) {
    strikes.push(strike)
  }
  return strikes
}

export const yearEndLegs = (spot1e6: bigint, grid: GridConfig): GridLeg[] => {
  const legs: GridLeg[] = []
  for (const strike of yearEndStrikes(spot1e6, grid.strikeStep, grid.strikeBandPct)) {
    for (const widthDollars of grid.widths) {
      const width = BigInt(widthDollars) * USD
      for (const kind of grid.kinds) {
        if (kind !== "call" && kind !== "put") {
          continue
        }
        if (kind === "put" && strike - width <= 0n) {
          continue
        }
        legs.push({
          kind,
          kindCode: kind === "call" ? 0 : 1,
          strike,
          width,
        })
      }
    }
  }
  return legs
}
