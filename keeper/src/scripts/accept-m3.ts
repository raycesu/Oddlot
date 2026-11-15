import { writeFileSync } from "node:fs"

import { Keypair } from "@solana/web3.js"

import {
  buySeries,
  fetchSeries,
  fetchVault,
  listSeries,
  loadSigners,
  nowSeconds,
} from "../actions.js"
import { loadConfig } from "../config.js"
import { fundWallet } from "../faucet.js"
import { startFaucetServer } from "../http.js"
import { ensureYearEndGrid, seedDemo } from "../jobs.js"
import { log, logError } from "../log.js"
import { postQuotesOnce } from "../loops/quote.js"
import { replayOnce } from "../loops/replay.js"
import { readReplayState } from "../loops/replay-state.js"
import { settleOnce } from "../loops/settle.js"
import { KIND_PUT } from "../pdas.js"
import { setupStream } from "../stream/setup.js"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const main = async () => {
  const config = loadConfig()
  const report: Record<string, unknown> = {}
  await ensureYearEndGrid(config)
  const started = Date.now()
  const posted = await postQuotesOnce(config)
  const { keeper } = loadSigners(config)
  const quoted = (await listSeries(config, keeper)).find((series) => series.quoteTs > 0n)
  const quoteMs = Date.now() - started
  report.quoteOnChain = {
    posted,
    latencyMs: quoteMs,
    series: quoted?.address.toBase58() ?? null,
    pass: Boolean(quoted) && quoteMs < 20_000,
  }

  const stream = await setupStream(config)
  report.stream = { id: stream.id ?? null, name: stream.name ?? null, pass: Boolean(stream.id || stream.name) }

  await seedDemo(config, "demo")
  startFaucetServer(config)
  await replayOnce(config)
  await postQuotesOnce(config)
  const vault = await fetchVault(config, keeper)
  const replay = readReplayState(config)
  const demoPut = (await listSeries(config, keeper)).find(
    (series) => series.kind === KIND_PUT && replay?.series.includes(series.address.toBase58()),
  )
  const buyer = Keypair.generate()
  const funded = await fundWallet(config, buyer.publicKey.toBase58())
  if (!funded.ok || !vault || !demoPut) {
    report.faucetBuy = { pass: false, funded, series: demoPut?.address.toBase58() ?? null }
  } else {
    const live = await fetchSeries(config, keeper, demoPut.address)
    if (!live) {
      throw new Error("demo put missing")
    }
    const buyStarted = Date.now()
    const signature = await buySeries(config, buyer, vault, live, 1n)
    report.faucetBuy = { pass: true, signature, wallet: buyer.publicKey.toBase58() }
    let seen = false
    while (Date.now() - buyStarted < 12_000) {
      const response = await fetch(`${config.pricerUrl}/trades`)
      const body = (await response.json()) as { trades?: { signature?: string }[] }
      seen = Boolean(body.trades?.some((trade) => trade.signature === signature))
      if (seen) {
        break
      }
      await sleep(1_000)
    }
    report.webhook = { pass: seen, latencyMs: Date.now() - buyStarted, signature }
  }

  const loops = setInterval(() => {
    void settleOnce(config)
    void replayOnce(config)
  }, 15_000)

  const expiryMs = Number(demoPut?.expiry ?? nowSeconds() + 480n) * 1000
  const deadline = expiryMs + 150_000
  let settled = false
  let openInterest = ""
  while (Date.now() < deadline) {
    if (!demoPut) {
      break
    }
    const current = await fetchSeries(config, keeper, demoPut.address)
    openInterest = current?.openInterest.toString() ?? ""
    if (current?.settled && current.openInterest === 0n) {
      settled = Date.now() <= expiryMs + 120_000
      report.settle = {
        pass: settled,
        settled: true,
        openInterest: "0",
        msAfterExpiry: Date.now() - expiryMs,
      }
      break
    }
    await sleep(5_000)
  }
  if (!report.settle) {
    report.settle = { pass: false, settled, openInterest, msAfterExpiry: Date.now() - expiryMs }
  }

  const pass = ["quoteOnChain", "faucetBuy", "webhook", "settle"].every(
    (key) => (report[key] as { pass?: boolean }).pass === true,
  )
  report.pass = pass
  writeFileSync(config.replayStatePath.replace("replay.json", "m3-report.json"), JSON.stringify(report, null, 2))
  log("m3_report", report)
  clearInterval(loops)
  process.exit(pass ? 0 : 1)
}

main().catch((error: unknown) => {
  logError("accept_fatal", error)
  process.exit(1)
})
