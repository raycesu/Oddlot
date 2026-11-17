import { appConfig } from "./config"
import { USD, formatUsdRaw } from "./money"
import type { SeriesView } from "./pdas"
import { KIND_CALL } from "./pdas"

const etFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

const etDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
})

export const formatDollars = (value: number | string | bigint): string => {
  let num: number
  if (typeof value === "bigint") {
    num = Number(value) / 1_000_000
  } else if (typeof value === "string") {
    num = Number.parseFloat(value)
  } else {
    num = value
  }
  if (!Number.isFinite(num)) {
    return "—"
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export const formatShares = (value: number | bigint): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value))

export const formatEt = (isoOrSeconds: string | number | bigint): string => {
  const date =
    typeof isoOrSeconds === "string"
      ? new Date(isoOrSeconds)
      : new Date(Number(isoOrSeconds) * 1000)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return `${etFormatter.format(date)} ET`
}

export const formatEtDate = (isoOrSeconds: string | number | bigint): string => {
  const date =
    typeof isoOrSeconds === "string"
      ? new Date(isoOrSeconds)
      : new Date(Number(isoOrSeconds) * 1000)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return etDateFormatter.format(date)
}

export const dollarsFrom1e6 = (raw: bigint): number => Number(raw) / Number(USD)

export const seriesLabel = (series: SeriesView): string => {
  const kind = series.kind === KIND_CALL ? "call" : "put"
  const strike = dollarsFrom1e6(series.strike)
  const width = dollarsFrom1e6(series.width)
  const long = series.kind === KIND_CALL ? strike : strike
  const short = series.kind === KIND_CALL ? strike + width : strike - width
  const expiry = formatEtDate(series.expiry)
  return `${appConfig.underlying} ${expiry} $${Math.round(long)}/$${Math.round(short)} ${kind}`
}

export const strikeChipLabel = (strike1e6: bigint): string =>
  `$${Math.round(dollarsFrom1e6(strike1e6))}`

export const shortPremium = (raw: bigint): string => formatDollars(formatUsdRaw(raw))
