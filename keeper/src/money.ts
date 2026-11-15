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

export const formatUsd = (raw: bigint): string => {
  const sign = raw < 0n ? "-" : ""
  const abs = raw < 0n ? -raw : raw
  const whole = abs / USD
  const frac = (abs % USD).toString().padStart(6, "0").replace(/0+$/, "")
  return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`
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

export const roundHalfEven = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator <= 0n) {
    throw new Error("denominator must be positive")
  }
  const negative = numerator < 0n
  const value = negative ? -numerator : numerator
  const quotient = value / denominator
  const remainder = value % denominator
  const twice = remainder * 2n
  let rounded = quotient
  if (twice > denominator || (twice === denominator && quotient % 2n === 1n)) {
    rounded = quotient + 1n
  }
  return negative ? -rounded : rounded
}

export const roundToStep = (usd1e6: bigint, stepDollars: number): bigint => {
  const step = BigInt(stepDollars) * USD
  return roundHalfEven(usd1e6, step) * step
}

export const scalePrice = (base1e6: bigint, factor: number): bigint => {
  const micro = BigInt(Math.round(factor * 1_000_000))
  return (base1e6 * micro) / 1_000_000n
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
