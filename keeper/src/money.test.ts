import assert from "node:assert/strict"
import test from "node:test"

import { pythToUsd1e6, roundHalfEven, roundToStep, scalePrice, usdTo1e6 } from "./money.js"

test("usd strings become USD x 1e6", () => {
  assert.equal(usdTo1e6("780"), 780_000_000n)
  assert.equal(usdTo1e6("0.05"), 50_000n)
  assert.equal(usdTo1e6("14.10"), 14_100_000n)
  assert.equal(usdTo1e6("1.2345"), 1_234_500n)
})

test("pyth expo converts to USD x 1e6", () => {
  assert.equal(pythToUsd1e6(71_760n, -2), 717_600_000n)
  assert.equal(pythToUsd1e6(780_00000n, -5), 780_000_000n)
})

test("year-end band rounds half even to the strike step", () => {
  const spot = 780_000_000n
  assert.equal(roundHalfEven(spot * 92n, 100n * 20_000_000n), 36n)
  assert.equal(roundToStep(717_600_000n, 20), 720_000_000n)
})

test("replay shock at 0.92 of 780 is 717.60", () => {
  assert.equal(scalePrice(780_000_000n, 0.92), 717_600_000n)
})
