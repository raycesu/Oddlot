import type { Metadata } from "next"
import { Fraunces, Geist, Geist_Mono } from "next/font/google"

import { Header } from "@/components/header"
import { Providers } from "@/components/providers"

import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fraunces",
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
    <body className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}>
      <Providers>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </Providers>
    </body>
  </html>
)

export default RootLayout
