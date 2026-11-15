import { PublicKey } from "@solana/web3.js"

import {
  fetchSeries,
  fetchVault,
  listSeries,
  loadSigners,
  nowSeconds,
  setDemoPrice,
  settleAndExercise,
} from "../actions.js"
import type { KeeperConfig } from "../config.js"
import { log, logError } from "../log.js"
import { scalePrice } from "../money.js"
import { ORACLE_DEMO } from "../pdas.js"
import { interpolateShock } from "../replay-math.js"
import { readReplayState } from "./replay-state.js"

export const replayOnce = async (config: KeeperConfig): Promise<void> => {
  const state = readReplayState(config)
  if (!state) {
    return
  }
  const { keeper } = loadSigners(config)
  const vault = await fetchVault(config, keeper)
  if (!vault) {
    return
  }
  const all = await listSeries(config, keeper)
  const tracked = new Set(state.series)
  const demo = all.filter(
    (series) =>
      series.oracleKind === ORACLE_DEMO &&
      !series.settled &&
      (tracked.size === 0 || tracked.has(series.address.toBase58())),
  )
  if (demo.length === 0) {
    log("replay_idle", { reason: "demo series settled" })
    return
  }
  const elapsed = Number(nowSeconds() - BigInt(state.createdAt))
  const factor = interpolateShock(config.shock, Math.max(0, elapsed))
  const price = scalePrice(BigInt(state.baseSpot), factor)
  try {
    await setDemoPrice(config, keeper, vault.address, price)
    log("replay_price", { elapsed, factor, price: price.toString() })
  } catch (error) {
    logError("replay_price_failed", error)
    return
  }
  const now = nowSeconds()
  for (const series of demo) {
    if (series.expiry > now) {
      continue
    }
    const fresh = await fetchSeries(config, keeper, new PublicKey(series.address))
    if (!fresh || fresh.settled) {
      continue
    }
    try {
      await settleAndExercise(config, keeper, vault, fresh)
    } catch (error) {
      logError("replay_settle_failed", error, { series: series.address.toBase58() })
    }
  }
}
