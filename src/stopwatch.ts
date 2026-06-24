// stopwatch.ts | stopwatch component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"

declare const setTimeout: any

/**
 * TickMsg is sent when the stopwatch ticks.
 */
export interface TickMsg {
  type: "stopwatchTick"
  id: number
}

/**
 * StartStopMsg is sent when the stopwatch starts or stops.
 */
export interface StartStopMsg {
  type: "stopwatchStartStop"
  id: number
  running: boolean
}

/**
 * ResetMsg is sent when the stopwatch is reset.
 */
export interface ResetMsg {
  type: "stopwatchReset"
  id: number
}

/**
 * StopwatchModel is the state for the stopwatch.
 */
export interface StopwatchModel {
  id: number
  interval: number
  elapsed: number
  running: boolean
  startTime: number | null
  resumeTime: number
}

let stopwatchId = 0

/**
 * Stopwatch creates a new stopwatch model.
 */
export function Stopwatch(interval: number = 100): StopwatchModel {
  return {
    id: stopwatchId++,
    interval,
    elapsed: 0,
    running: false,
    startTime: null,
    resumeTime: 0,
  }
}

/**
 * Start starts the stopwatch.
 */
export function Start(m: StopwatchModel): [StopwatchModel, Cmd] {
  return [
    {
      ...m,
      running: true,
      startTime: Date.now() - m.elapsed,
    },
    TickCmd(m),
  ]
}

/**
 * Stop stops the stopwatch.
 */
export function Stop(m: StopwatchModel): StopwatchModel {
  if (!m.running || !m.startTime) return m
  return {
    ...m,
    running: false,
    elapsed: Date.now() - m.startTime,
    startTime: null,
  }
}

/**
 * Toggle toggles the stopwatch.
 */
export function Toggle(m: StopwatchModel): [StopwatchModel, Cmd] {
  if (m.running) {
    return [Stop(m), null]
  }
  return Start(m)
}

/**
 * Reset resets the stopwatch.
 */
export function Reset(m: StopwatchModel): StopwatchModel {
  return { ...m, elapsed: 0, running: false, startTime: null }
}

/**
 * Running returns whether the stopwatch is running.
 */
export function Running(m: StopwatchModel): boolean {
  return m.running
}

/**
 * Elapsed returns the elapsed time in milliseconds.
 */
export function Elapsed(m: StopwatchModel): number {
  if (m.running && m.startTime) {
    return Date.now() - m.startTime
  }
  return m.elapsed
}

/**
 * Update handles stopwatch messages.
 */
export function Update(m: StopwatchModel, msg: Msg): [StopwatchModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "stopwatchTick":
      if (!m.running) return [m, null]
      return [m, TickCmd(m)]
    default:
      return [m, null]
  }
}

/**
 * TickCmd returns a command that sends a tick message.
 */
export function TickCmd(m: StopwatchModel): Cmd {
  return () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "stopwatchTick", id: m.id } as any)
      }, m.interval)
    })
  }
}

/**
 * View renders the stopwatch.
 */
export function View(m: StopwatchModel): string {
  const ms = Elapsed(m)
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const centiseconds = Math.floor((ms % 1000) / 10)
  const style = m.running ? new Style().foreground("green") : new Style()
  return style.render(
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`,
  )
}
