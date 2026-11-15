import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"

import type { KeeperConfig } from "../config.js"

export type ReplayState = {
  createdAt: string
  baseSpot: string
  series: string[]
}

export const readReplayState = (config: KeeperConfig): ReplayState | null => {
  try {
    return JSON.parse(readFileSync(config.replayStatePath, "utf8")) as ReplayState
  } catch {
    return null
  }
}

export const writeReplayState = (config: KeeperConfig, state: ReplayState): void => {
  mkdirSync(path.dirname(config.replayStatePath), { recursive: true })
  writeFileSync(config.replayStatePath, `${JSON.stringify(state, null, 2)}\n`)
}
