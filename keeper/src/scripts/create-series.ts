import { loadConfig } from "../config.js"
import { logError } from "../log.js"
import { ensureYearEndGrid } from "../jobs.js"

const main = async () => {
  await ensureYearEndGrid(loadConfig())
}

main().catch((error: unknown) => {
  logError("create_series_fatal", error)
  process.exit(1)
})
