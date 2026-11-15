import { postQuotesOnce } from "./loops/quote.js"
import { replayOnce } from "./loops/replay.js"
import { settleOnce } from "./loops/settle.js"
import { loadConfig } from "./config.js"
import { log, logError } from "./log.js"
import { startFaucetServer } from "./http.js"

const every = (ms: number, name: string, tick: () => Promise<void>): (() => void) => {
  let running = false
  const run = async () => {
    if (running) {
      return
    }
    running = true
    try {
      await tick()
    } catch (error) {
      logError("loop_error", error, { name })
    } finally {
      running = false
    }
  }
  void run()
  const timer = setInterval(() => {
    void run()
  }, ms)
  return () => clearInterval(timer)
}

const main = async () => {
  const config = loadConfig()
  log("keeper_start", {
    program: config.programId.toBase58(),
    pricer: config.pricerUrl,
    port: config.port,
  })
  const stopQuote = every(config.file.keeper.quote_interval_s * 1000, "quote", () =>
    postQuotesOnce(config).then(() => undefined),
  )
  const stopSettle = every(config.file.keeper.settle_poll_s * 1000, "settle", () => settleOnce(config))
  const stopReplay = every(5_000, "replay", () => replayOnce(config))
  const server = startFaucetServer(config)
  const shutdown = () => {
    stopQuote()
    stopSettle()
    stopReplay()
    server.close()
    process.exit(0)
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((error: unknown) => {
  logError("keeper_fatal", error)
  process.exit(1)
})
