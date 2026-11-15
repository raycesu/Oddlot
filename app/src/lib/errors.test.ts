import { describe, expect, it } from "vitest"

import {
  PROGRAM_ERROR_MESSAGES,
  mapProgramError,
  mappedProgramErrors,
  messageForErrorName,
} from "./errors"

const REQUIRED = [
  "MarketClosed",
  "QuoteStale",
  "SlippageExceeded",
  "OpenInterestCap",
  "UtilizationCap",
  "BuyWindowClosed",
  "Paused",
] as const

describe("program error map", () => {
  it("covers every required PRD error with the plain message", () => {
    for (const name of REQUIRED) {
      expect(PROGRAM_ERROR_MESSAGES[name]).toBeTruthy()
      expect(mappedProgramErrors).toContain(name)
    }
  })

  it("maps each required error name from thrown text", () => {
    expect(mapProgramError("Error: MarketClosed")).toBe(
      "Market closed. Sales resume at 9:30 AM ET.",
    )
    expect(mapProgramError("QuoteStale in simulation")).toBe(
      "Price is refreshing. Try again in a few seconds.",
    )
    expect(mapProgramError("SlippageExceeded")).toBe(
      "The price moved. Review the new price and try again.",
    )
    expect(mapProgramError("OpenInterestCap")).toBe("This strike is sold out.")
    expect(mapProgramError("UtilizationCap")).toBe("The vault is at capacity right now.")
    expect(mapProgramError("BuyWindowClosed")).toBe(
      "Sales for this series have closed before expiry.",
    )
    expect(mapProgramError("Paused")).toBe("Sales are paused.")
  })

  it("maps custom program error hex codes", () => {
    expect(mapProgramError("custom program error: 0x1774")).toBe(
      messageForErrorName("MarketClosed"),
    )
    expect(mapProgramError("custom program error: 0x1770")).toBe(messageForErrorName("Paused"))
    expect(mapProgramError("custom program error: 0x1778")).toBe(
      messageForErrorName("SlippageExceeded"),
    )
  })

  it("maps token insufficient funds and simulation failures", () => {
    expect(mapProgramError("Error: insufficient funds")).toBe(
      "Not enough test USDC for this size. Lower quantity or use the faucet.",
    )
    expect(mapProgramError("Failed to simulate the results of this request")).toBe(
      "Wallet could not simulate this buy. Check quote freshness, USDC balance, and try again.",
    )
  })
})
