"use client"

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { useMemo, type ReactNode } from "react"
import { Toaster } from "sonner"

import { appConfig } from "@/lib/config"

import "@solana/wallet-adapter-react-ui/styles.css"

type ProvidersProps = {
  children: ReactNode
}

export const Providers = ({ children }: ProvidersProps) => {
  const endpoint = appConfig.rpcUrl
  // Empty array → Wallet Standard auto-detects Phantom (avoids wallet-adapter-wallets / WalletConnect tree)
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
