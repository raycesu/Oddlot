"use client"

import { useEffect } from "react"

const DEFAULT_INTERVAL_MS = 30_000

/**
 * Poll `refresh` while the document is visible; pause when the tab is hidden.
 * Refetches immediately when the tab becomes visible again.
 */
export const useVisibilityPoll = (
  refresh: () => void | Promise<void>,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): void => {
  useEffect(() => {
    let timer: number | null = null

    const clearTimer = () => {
      if (timer === null) {
        return
      }
      window.clearInterval(timer)
      timer = null
    }

    const startPolling = () => {
      clearTimer()
      void refresh()
      timer = window.setInterval(() => {
        void refresh()
      }, intervalMs)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTimer()
        return
      }
      startPolling()
    }

    if (document.visibilityState === "visible") {
      startPolling()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      clearTimer()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refresh, intervalMs])
}
