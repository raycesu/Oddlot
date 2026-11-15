"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { requestFaucet } from "@/lib/api"
import { explorerTxUrl } from "@/lib/config"

type FaucetButtonProps = {
  onFunded?: () => void
}

export const FaucetButton = ({ onFunded }: FaucetButtonProps) => {
  const { publicKey } = useWallet()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (!publicKey) {
      toast.error("Connect a wallet first")
      return
    }
    setIsLoading(true)
    try {
      const result = await requestFaucet(publicKey.toBase58())
      toast.success(`Received ${result.usdc} test USDC`, {
        action: {
          label: "Explorer",
          onClick: () => window.open(explorerTxUrl(result.signature), "_blank"),
        },
      })
      onFunded?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Faucet failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="teal"
      onClick={() => void handleClick()}
      disabled={isLoading || !publicKey}
      aria-label="Get test USDC"
      data-testid="faucet-button"
    >
      {isLoading ? "Requesting…" : "Get test USDC"}
    </Button>
  )
}
