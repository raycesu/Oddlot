export const USD = 1_000_000n

export const usdTo1e6 = (value: string): bigint => {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith("-")) {
    throw new Error(`usd must be a non-negative decimal, got ${value}`)
  }
  const [whole, frac = ""] = trimmed.split(".")
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error(`usd must be a non-negative decimal, got ${value}`)
  }
  const digits = `${frac}000000`.slice(0, 6)
  return BigInt(whole) * USD + BigInt(digits)
}

export const formatUsdRaw = (raw: bigint): string => {
  const sign = raw < 0n ? "-" : ""
  const abs = raw < 0n ? -raw : raw
  const whole = abs / USD
  const frac = (abs % USD).toString().padStart(6, "0").replace(/0+$/, "")
  return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`
}

export const asBigint = (value: unknown): bigint => {
  if (typeof value === "bigint") {
    return value
  }
  if (typeof value === "number") {
    return BigInt(Math.trunc(value))
  }
  if (typeof value === "string") {
    return BigInt(value)
  }
  if (value && typeof value === "object" && "toString" in value) {
    return BigInt(String(value))
  }
  throw new Error("value is not an integer")
}

export const pythToUsd1e6 = (price: bigint, expo: number): bigint => {
  if (price <= 0n) {
    throw new Error("pyth price must be positive")
  }
  const shift = BigInt(expo + 6)
  if (shift >= 0n) {
    return price * 10n ** shift
  }
  return price / 10n ** -shift
}

export const maxCostFor = (premium: bigint, qty: bigint): bigint => {
  const cost = premium * qty
  return cost + cost / 100n + 1n
}
