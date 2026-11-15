import { loadConfig } from "../config.js"
import { logError } from "../log.js"
import { setupStream } from "../stream/setup.js"

const main = async () => {
  await setupStream(loadConfig())
}

main().catch((error: unknown) => {
  logError("stream_setup_fatal", error)
  process.exit(1)
})
