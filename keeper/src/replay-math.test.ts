import assert from "node:assert/strict"
import test from "node:test"

import { interpolateShock } from "./replay-math.js"

const shock = [
  { t: 0, x: 1 },
  { t: 240, x: 1 },
  { t: 300, x: 0.92 },
  { t: 600, x: 0.92 },
]

test("shock holds, then falls 8 percent, then holds", () => {
  assert.equal(interpolateShock(shock, 0), 1)
  assert.equal(interpolateShock(shock, 240), 1)
  assert.equal(interpolateShock(shock, 270), 0.96)
  assert.equal(interpolateShock(shock, 300), 0.92)
  assert.equal(interpolateShock(shock, 700), 0.92)
})
