import { loadConfig } from "../config.js"
import { seedDemo } from "../jobs.js"
import { logError } from "../log.js"

const targetArg = (): "demo" | "year-end" => {
  const index = process.argv.indexOf("--target")
  const value = index >= 0 ? process.argv[index + 1] : "demo"
  if (value !== "demo" && value !== "year-end") {
    throw new Error("--target must be demo or year-end")
  }
  return value
}

const main = async () => {
  await seedDemo(loadConfig(), targetArg())
}

main().catch((error: unknown) => {
  logError("seed_demo_fatal", error)
  process.exit(1)
})
