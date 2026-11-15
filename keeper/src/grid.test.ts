import assert from "node:assert/strict"
import test from "node:test"

import { yearEndLegs, yearEndStrikes } from "./grid.js"

test("780 spot with an 8 percent band lands on 720 through 840", () => {
  const strikes = yearEndStrikes(780_000_000n, 20, 8).map((strike) => Number(strike / 1_000_000n))
  assert.deepEqual(strikes, [720, 740, 760, 780, 800, 820, 840])
})

test("each strike gets both widths and both kinds", () => {
  const legs = yearEndLegs(780_000_000n, {
    strikeStep: 20,
    strikeBandPct: 8,
    widths: [20, 40],
    kinds: ["call", "put"],
  })
  assert.equal(legs.length, 7 * 2 * 2)
  assert.equal(legs.filter((leg) => leg.kind === "put" && leg.strike === 780_000_000n).length, 2)
})
