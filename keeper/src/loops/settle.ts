import { fetchVault, listSeries, loadSigners, nowSeconds, settleAndExercise } from "../actions.js"
import type { KeeperConfig } from "../config.js"
import { log, logError } from "../log.js"
import { ORACLE_DEMO } from "../pdas.js"

export const settleOnce = async (config: KeeperConfig): Promise<void> => {
  const { keeper } = loadSigners(config)
  const vault = await fetchVault(config, keeper)
  if (!vault) {
    log("settle_skip", { reason: "vault missing" })
    return
  }
  const now = nowSeconds()
  const feedHex = config.feedId.replace(/^0x/i, "").toLowerCase()
  const seriesList = await listSeries(config, keeper)
  for (const series of seriesList) {
    if (series.settled && series.openInterest === 0n) {
      continue
    }
    if (!series.settled && series.expiry > now) {
      continue
    }
    // Leftover year-end PDAs (e.g. SPY) cannot settle with the current Hermes feed.
    if (
      series.oracleKind !== ORACLE_DEMO &&
      (series.underlying !== config.file.underlying || series.pythFeedId !== feedHex)
    ) {
      continue
    }
    try {
      await settleAndExercise(config, keeper, vault, series)
      log("settle_series", { series: series.address.toBase58() })
    } catch (error) {
      logError("settle_series_failed", error, { series: series.address.toBase58() })
    }
  }
}
