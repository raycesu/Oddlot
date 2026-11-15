export type ShockPoint = {
  t: number
  x: number
}

export const interpolateShock = (points: ShockPoint[], elapsed: number): number => {
  if (points.length === 0) {
    throw new Error("replay shock is empty")
  }
  const first = points[0]
  if (!first || elapsed <= first.t) {
    return first?.x ?? 1
  }
  const last = points[points.length - 1]
  if (!last || elapsed >= last.t) {
    return last?.x ?? 1
  }
  for (let index = 1; index < points.length; index += 1) {
    const right = points[index]
    const left = points[index - 1]
    if (!right || !left || elapsed > right.t) {
      continue
    }
    const span = right.t - left.t
    if (span <= 0) {
      return right.x
    }
    const weight = (elapsed - left.t) / span
    return left.x + (right.x - left.x) * weight
  }
  return last.x
}
