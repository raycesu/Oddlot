export type LogFields = Record<string, unknown>

export const log = (event: string, fields: LogFields = {}): void => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...fields,
    }),
  )
}

export const logError = (event: string, error: unknown, fields: LogFields = {}): void => {
  const message = error instanceof Error ? error.message : String(error)
  log(event, { ...fields, error: message })
}
