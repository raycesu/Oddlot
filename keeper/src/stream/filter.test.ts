import assert from "node:assert/strict"
import test from "node:test"

import { streamFilterSource } from "./filter.js"

const PROGRAM = "AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n"

const runFilter = (stream: unknown) => {
  const main = new Function(`${streamFilterSource(PROGRAM)}\nreturn main;`)() as (
    value: unknown,
  ) => unknown
  return main(stream)
}

test("filter keeps Program data for the oddlot program and drops the rest", () => {
  const payload = runFilter({
    data: [
      {
        slot: 10,
        blockTime: 20,
        transactions: [
          {
            meta: { err: { InstructionError: [0, "Custom"] }, logMessages: [] },
            transaction: { signatures: ["err"], message: { accountKeys: [PROGRAM] } },
          },
          {
            meta: {
              err: null,
              logMessages: ["Program data: aGVsbG8="],
            },
            transaction: {
              signatures: ["other"],
              message: { accountKeys: ["11111111111111111111111111111111"] },
            },
          },
          {
            meta: {
              err: null,
              logMessages: [
                `Program ${PROGRAM} invoke [1]`,
                "Program data: Ym91Z2h0",
                "Program data: ",
              ],
            },
            transaction: {
              signatures: ["buy"],
              message: { accountKeys: [{ pubkey: PROGRAM }] },
            },
          },
        ],
      },
    ],
  }) as { matches: { signature: string; slot: number; events: string[] }[] }

  assert.equal(payload.matches.length, 1)
  assert.equal(payload.matches[0]?.signature, "buy")
  assert.equal(payload.matches[0]?.slot, 10)
  assert.deepEqual(payload.matches[0]?.events, ["Ym91Z2h0"])
})

test("filter reads the programs-with-logs rows", () => {
  const payload = runFilter({
    data: [
      [
        {
          signature: "noise",
          slot: 4,
          blockTime: 5,
          success: true,
          logs: ["Program 11111111111111111111111111111111 invoke [1]", "Program data: bm9pc2U="],
          programInvocations: [{ programId: "11111111111111111111111111111111" }],
        },
        {
          signature: "buy",
          slot: 4,
          blockTime: 5,
          success: true,
          logs: [`Program ${PROGRAM} invoke [1]`, "Program data: Ym91Z2h0"],
          programInvocations: [{ programId: PROGRAM }],
        },
      ],
    ],
  }) as { matches: { signature: string; events: string[] }[] }

  assert.equal(payload.matches.length, 1)
  assert.equal(payload.matches[0]?.signature, "buy")
  assert.deepEqual(payload.matches[0]?.events, ["Ym91Z2h0"])
})

test("filter returns null when nothing matches", () => {
  assert.equal(runFilter({ data: [] }), null)
})
