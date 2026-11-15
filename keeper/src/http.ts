import { createServer, type Server } from "node:http"

import type { KeeperConfig } from "./config.js"
import { fundWallet } from "./faucet.js"
import { log } from "./log.js"

export const startFaucetServer = (config: KeeperConfig): Server => {
  const server = createServer((req, res) => {
    const sendJson = (status: number, body: unknown) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      })
      res.end(JSON.stringify(body))
    }
    if (req.method === "OPTIONS") {
      sendJson(204, {})
      return
    }
    if (req.method === "GET" && req.url === "/health") {
      sendJson(200, { status: "ok", service: "oddlot-keeper" })
      return
    }
    if (req.method !== "POST" || req.url !== "/faucet") {
      sendJson(404, { error: "not found" })
      return
    }
    const chunks: Buffer[] = []
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on("end", () => {
      void (async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { wallet?: string }
          if (!body.wallet) {
            sendJson(400, { error: "wallet is required" })
            return
          }
          const result = await fundWallet(config, body.wallet)
          if (!result.ok) {
            sendJson(result.status, { error: result.error, retry_after_s: result.retryAfterS })
            return
          }
          sendJson(200, {
            wallet: body.wallet,
            usdc: result.usdc,
            sol: result.sol,
            signature: result.signature,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : "faucet failed"
          log("faucet_error", { error: message })
          sendJson(500, { error: message })
        }
      })()
    })
  })
  server.listen(config.port, () => {
    log("faucet_listen", { port: config.port })
  })
  return server
}
