import { copyFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const dest = path.join(root, "app/src/data")
mkdirSync(dest, { recursive: true })
copyFileSync(path.join(root, "idl/oddlot.json"), path.join(dest, "oddlot.json"))
copyFileSync(path.join(root, "config/oddlot.json"), path.join(dest, "config.json"))
console.log("synced idl + config into app/src/data")
