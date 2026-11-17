import type { Metadata } from "next"
import localFont from "next/font/local"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import { Header } from "@/components/header"
import { Providers } from "@/components/providers"

import "./globals.css"

const fraunces = localFont({
  src: [
    {
      path: "../fonts/fraunces-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/fraunces-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Oddlot",
  description: "VOO options in one-share lots on Solana",
}

type RootLayoutProps = {
  children: React.ReactNode
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <body
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} antialiased`}
    >
      <Providers>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </Providers>
    </body>
  </html>
)

export default RootLayout
