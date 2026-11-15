/** NYSE regular hours in America/New_York: Mon–Fri 09:30–16:00. */
export const isUsEquityMarketOpen = (now = new Date()): boolean => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)

  const weekday = parts.find((part) => part.type === "weekday")?.value
  const hour = Number(parts.find((part) => part.type === "hour")?.value)
  const minute = Number(parts.find((part) => part.type === "minute")?.value)
  if (!weekday || Number.isNaN(hour) || Number.isNaN(minute)) {
    return false
  }
  if (weekday === "Sat" || weekday === "Sun") {
    return false
  }
  const mins = hour * 60 + minute
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}

export type MarketStatus = {
  open: boolean
  label: string
}

export const marketStatus = (now = new Date()): MarketStatus => {
  if (isUsEquityMarketOpen(now)) {
    return { open: true, label: "Market open" }
  }
  return { open: false, label: "Market closed · reopens 9:30 AM ET" }
}
