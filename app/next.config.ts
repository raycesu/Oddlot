import type { NextConfig } from "next"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const webpack = require("webpack") as typeof import("webpack")

const jitoStub = path.join(__dirname, "src/lib/jito-stub.ts")

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    externalDir: true,
  },
  transpilePackages: [
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@coral-xyz/anchor",
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    }
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/jito\.mjs$/, jitoStub),
      new webpack.NormalModuleReplacementPlugin(/^jito-ts(\/.*)?$/, jitoStub),
    )
    config.externals = [...(config.externals || []), "pino-pretty", "encoding"]
    return config
  },
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
