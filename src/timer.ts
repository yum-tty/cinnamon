// timer.ts | timer component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"

/**
 * TickMsg is sent when the timer ticks.
 */
export interface TickMsg {
  type: "timerTick"
  id: number
}

/**
 * TimeoutMsg is sent when the timer times out.
 */
export interface TimeoutMsg {
  type: "timerTimeout"
  id: number
}

/**
 * StartStopMsg is sent when the timer starts or stops.
 */
export interface StartStopMsg {
  type: "timerStartStop"
  id: number
  running: boolean
}

/**
 * ResetMsg is sent when the timer is reset.
 */
export interface ResetMsg {
  type: "timerReset"
  id: number
}

/**
 * TimerModel is the state for the timer.
 */
export interface TimerModel {
  id: number
  timeout: number
  interval: number
  elapsed: number
  running: boolean
  timedOut: boolean
  startTime: number | null
}

let timerId = 0

/**
 * Timer creates a new timer model.
 */
export function Timer(timeout: number, interval: number = 1000): TimerModel {
  return {
    id: timerId++,
    timeout,
    interval,
    elapsed: 0,
    running: false,
    timedOut: false,
    startTime: null,
  }
}

/**
 * Start starts the timer.
 */
export function Start(m: TimerModel): [TimerModel, Cmd] {
  return [
    { ...m, running: true, startTime: Date.now() },
    TickCmd(m),
  ]
}

/**
 * Stop stops the timer.
 */
export function Stop(m: TimerModel): TimerModel {
  return { ...m, running: false }
}

/**
 * Toggle toggles the timer.
 */
export function Toggle(m: TimerModel): [TimerModel, Cmd] {
  if (m.running) {
    return [Stop(m), null]
  }
  return Start(m)
}

/**
 * Reset resets the timer.
 */
export function Reset(m: TimerModel): TimerModel {
  return { ...m, elapsed: 0, running: false, timedOut: false, startTime: null }
}

/**
 * Running returns whether the timer is running.
 */
export function Running(m: TimerModel): boolean {
  return m.running
}

/**
 * Timedout returns whether the timer has timed out.
 */
export function Timedout(m: TimerModel): boolean {
  return m.timedOut
}

/**
 * Elapsed returns the elapsed time.
 */
export function Elapsed(m: TimerModel): number {
  return m.elapsed
}

/**
 * Update handles timer messages.
 */
export function Update(m: TimerModel, msg: Msg): [TimerModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "timerTick":
      if (!m.running || !m.startTime) return [m, null]
      const elapsed = Date.now() - m.startTime
      if (elapsed >= m.timeout) {
        return [
          { ...m, elapsed: m.timeout, running: false, timedOut: true },
          null,
        ]
      }
      return [
        { ...m, elapsed },
        TickCmd(m),
      ]
    default:
      return [m, null]
  }
}

/**
 * TickCmd returns a command that sends a tick message.
 */
export function TickCmd(m: TimerModel): Cmd {
  return () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "timerTick", id: m.id } as any)
      }, m.interval)
    })
  }
}

/**
 * View renders the timer.
 */
export function View(m: TimerModel): string {
  const elapsed = Math.floor(m.elapsed / 1000)
  const remaining = Math.max(0, Math.ceil((m.timeout - m.elapsed) / 1000))
  const style = m.timedOut ? Style().foreground("red") : Style()
  return style.render(`${elapsed}s / ${Math.ceil(m.timeout / 1000)}s`)
}
