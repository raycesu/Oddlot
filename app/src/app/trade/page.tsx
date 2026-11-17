import { TradeScreen, type TradeSide } from "@/components/trade-screen"

type TradePageProps = {
  searchParams: Promise<{ side?: string }>
}

const TradePage = async ({ searchParams }: TradePageProps) => {
  const params = await searchParams
  const side: TradeSide = params.side === "call" ? "call" : "put"
  return <TradeScreen initialSide={side} />
}

export default TradePage
