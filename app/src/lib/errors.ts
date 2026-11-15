export const PROGRAM_ERROR_MESSAGES: Record<string, string> = {
  MarketClosed: "Market closed. Sales resume at 9:30 AM ET.",
  QuoteStale: "Price is refreshing. Try again in a few seconds.",
  SlippageExceeded: "The price moved. Review the new price and try again.",
  OpenInterestCap: "This strike is sold out.",
  UtilizationCap: "The vault is at capacity right now.",
  BuyWindowClosed: "Sales for this series have closed before expiry.",
  Paused: "Sales are paused.",
  ZeroQuantity: "Enter a quantity greater than zero.",
  OracleConfidence: "The oracle price is too uncertain right now.",
  InvalidOracle: "Oracle update failed. Try again.",
  InsufficientFreeLiquidity: "Not enough free liquidity for this withdrawal.",
  NotExpired: "This series has not expired yet.",
  AlreadySettled: "This series is already settled.",
  NotSettled: "This series is not settled yet.",
  SettlePriceOutOfWindow: "Settle price is outside the allowed window.",
  InvalidSeriesParams: "Invalid series parameters.",
  WrongMint: "Wrong option mint for this series.",
  Unauthorized: "Unauthorized signer.",
  MathOverflow: "Math overflow in the program.",
}

const ERROR_NAME_BY_CODE: Record<number, string> = {
  6000: "Paused",
  6001: "ZeroQuantity",
  6002: "BuyWindowClosed",
  6003: "QuoteStale",
  6004: "MarketClosed",
  6005: "OracleConfidence",
  6006: "InvalidOracle",
  6007: "OpenInterestCap",
  6008: "SlippageExceeded",
  6009: "UtilizationCap",
  6010: "InsufficientFreeLiquidity",
  6011: "NotExpired",
  6012: "AlreadySettled",
  6013: "NotSettled",
  6014: "SettlePriceOutOfWindow",
  6015: "InvalidSeriesParams",
  6016: "WrongMint",
  6017: "Unauthorized",
  6018: "MathOverflow",
}

export const mappedProgramErrors = Object.keys(PROGRAM_ERROR_MESSAGES)

export const messageForErrorName = (name: string): string =>
  PROGRAM_ERROR_MESSAGES[name] ?? "Transaction failed. Try again."

export const mapProgramError = (error: unknown): string => {
  if (!error) {
    return "Transaction failed. Try again."
  }
  const text =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? `${error.name} ${error.message}`
        : JSON.stringify(error)

  for (const name of Object.keys(PROGRAM_ERROR_MESSAGES)) {
    if (text.includes(name)) {
      return messageForErrorName(name)
    }
  }

  const customMatch = text.match(/custom program error:\s*0x([0-9a-f]+)/i)
  if (customMatch) {
    const code = Number.parseInt(customMatch[1], 16)
    const name = ERROR_NAME_BY_CODE[code]
    if (name) {
      return messageForErrorName(name)
    }
  }

  const codeMatch = text.match(/Error Code:\s*(\w+)/i)
  if (codeMatch?.[1] && PROGRAM_ERROR_MESSAGES[codeMatch[1]]) {
    return messageForErrorName(codeMatch[1])
  }

  if (text.includes("User rejected") || text.includes("rejected the request")) {
    return "Wallet rejected the transaction."
  }

  return "Transaction failed. Try again."
}
