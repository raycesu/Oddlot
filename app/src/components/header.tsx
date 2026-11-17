"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useMarketStatus } from "@/hooks/use-market-status"
import { cn } from "@/lib/utils"

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <div
        className="wallet-adapter-button wallet-adapter-button-trigger h-12 min-w-[140px] animate-pulse rounded-md bg-line/50"
        aria-hidden
      />
    ),
  },
)

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trade", label: "Trade" },
  { href: "/vault", label: "Vault" },
]

export const Header = () => {
  const pathname = usePathname()
  const market = useMarketStatus()

  return (
    <header className="border-b border-line/80 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/dashboard"
          className="font-display text-2xl tracking-tight text-ink"
          aria-label="Oddlot home"
        >
          Oddlot
        </Link>
        <span
          className="rounded border border-line px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted"
          data-testid="devnet-badge"
        >
          Devnet
        </span>
        <nav className="flex items-center gap-1 sm:ml-4" aria-label="Primary">
          {NAV.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-shadow",
                  isActive ? "halo-blue" : "rounded-full text-slate hover:bg-paper",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              market.open ? "halo-blue" : "halo-orange",
            )}
            data-testid="market-chip"
          >
            {market.label}
          </span>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  )
}
