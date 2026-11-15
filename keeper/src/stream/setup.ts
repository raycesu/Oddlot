import type { KeeperConfig } from "../config.js"
import { log } from "../log.js"
import { streamFilterSource } from "./filter.js"

const STREAMS = "https://api.quicknode.com/streams/rest/v1/streams"
const NAME = "oddlot-devnet-program"
const DATASET = "programs_with_logs"
const RETIRED = new Set(["oddlot-devnet-logs", "oddlot-devnet-debug", "oddlot-devnet-null"])

type StreamRow = {
  id?: string
  name?: string
  network?: string
  dataset?: string
  destination?: string
  destination_attributes?: { url?: string; security_token?: string; headers?: Record<string, string> }
  status?: string
}

const headers = (apiKey: string): Headers => {
  const value = new Headers()
  value.set("accept", "application/json")
  value.set("content-type", "application/json")
  value.set("x-api-key", apiKey)
  return value
}

const stripSecrets = (stream: StreamRow): StreamRow => ({
  id: stream.id,
  name: stream.name,
  network: stream.network,
  dataset: stream.dataset,
  destination: stream.destination,
  status: stream.status,
  destination_attributes: {
    url: stream.destination_attributes?.url,
    headers: stream.destination_attributes?.headers
      ? { "x-quicknode-token": "set" }
      : undefined,
  },
})

export const setupStream = async (config: KeeperConfig): Promise<StreamRow> => {
  if (!config.quicknodeKey) {
    throw new Error("QUICKNODE_API_KEY is empty")
  }
  if (!config.streamToken) {
    throw new Error("QUICKNODE_STREAM_TOKEN is empty")
  }
  const listResponse = await fetch(STREAMS, { headers: headers(config.quicknodeKey) })
  if (!listResponse.ok) {
    throw new Error(`list streams failed with ${listResponse.status}`)
  }
  const listed = (await listResponse.json()) as { data?: StreamRow[] } | StreamRow[]
  const rows = Array.isArray(listed) ? listed : listed.data ?? []
  for (const row of rows) {
    if (!row.id || (row.name !== NAME && !RETIRED.has(row.name ?? ""))) {
      continue
    }
    const reusable = row.name === NAME && row.status === "active" && row.dataset === DATASET
    if (reusable) {
      log("stream_exists", stripSecrets(row))
      return row
    }
    const removed = await fetch(`${STREAMS}/${row.id}`, {
      method: "DELETE",
      headers: headers(config.quicknodeKey),
    })
    if (!removed.ok && removed.status !== 404) {
      throw new Error(`delete stream failed with ${removed.status}`)
    }
    log("stream_replaced", { id: row.id, name: row.name ?? null, status: row.status ?? null })
  }
  const filter = streamFilterSource(config.programId.toBase58())
  const destination = `${config.pricerUrl}/webhook/quicknode`
  const body: Record<string, unknown> = {
    name: NAME,
    network: "solana-devnet",
    dataset: DATASET,
    region: "usa_east",
    dataset_batch_size: 1,
    elastic_batch_enabled: true,
    keep_distance_from_tip: 0,
    fix_block_reorgs: 0,
    status: "active",
    filter_function: Buffer.from(filter, "utf8").toString("base64"),
    destination: "webhook",
    destination_attributes: {
      url: destination,
      compression: "none",
      max_retry: 3,
      retry_interval_sec: 1,
      post_timeout_sec: 30,
      headers: { "x-quicknode-token": config.streamToken },
    },
  }
  const createdResponse = await fetch(STREAMS, {
    method: "POST",
    headers: headers(config.quicknodeKey),
    body: JSON.stringify(body),
  })
  const created = (await createdResponse.json()) as StreamRow & { error?: { message?: string } }
  if (!createdResponse.ok) {
    throw new Error(created.error?.message || `create stream failed with ${createdResponse.status}`)
  }
  const printable = stripSecrets(created)
  log("stream_created", {
    ...printable,
    why: "Bought logs drive the hedger webhook",
    filter: "program id + Program data logs",
  })
  await fetch(destination, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-quicknode-token": config.streamToken,
    },
    body: JSON.stringify({ matches: [] }),
  })
  console.log(JSON.stringify(printable, null, 2))
  return created
}

export const readStream = async (
  config: KeeperConfig,
): Promise<{ id: string | null; status: string | null; sequence: number | null }> => {
  if (!config.quicknodeKey) {
    throw new Error("QUICKNODE_API_KEY is empty")
  }
  const listResponse = await fetch(STREAMS, { headers: headers(config.quicknodeKey) })
  if (!listResponse.ok) {
    throw new Error(`list streams failed with ${listResponse.status}`)
  }
  const listed = (await listResponse.json()) as { data?: StreamRow[] }
  const row = (listed.data ?? []).find((item) => item.name === NAME)
  if (!row?.id) {
    return { id: null, status: null, sequence: null }
  }
  const detailResponse = await fetch(`${STREAMS}/${row.id}`, { headers: headers(config.quicknodeKey) })
  if (!detailResponse.ok) {
    return { id: row.id, status: row.status ?? null, sequence: null }
  }
  const detail = (await detailResponse.json()) as StreamRow & { sequence?: number }
  return {
    id: detail.id ?? row.id,
    status: detail.status ?? null,
    sequence: detail.sequence ?? null,
  }
}
