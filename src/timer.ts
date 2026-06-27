// timer.ts | timer component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"

declare const setTimeout: any

let timerId = 0

export type Option = (m: TimerModel) => void

export function WithInterval(interval: number): Option {
  return (m) => {
    m.interval = interval
  }
}

export interface TickMsg {
  type: "timerTick"
  id: number
  timeout: boolean
  tag: number
}

export interface TimeoutMsg {
  type: "timerTimeout"
  id: number
}

export interface StartStopMsg {
  type: "timerStartStop"
  id: number
  running: boolean
}

export interface TimerModel {
  id: number
  timeout: number
  interval: number
  elapsed: number
  running: boolean
  timedOut: boolean
  tag: number
}

export function Timer(timeout: number, ...opts: Option[]): TimerModel {
  const m: TimerModel = {
    id: timerId++,
    timeout,
    interval: 1000,
    elapsed: 0,
    running: true,
    timedOut: false,
    tag: 0,
  }
  for (const opt of opts) {
    opt(m)
  }
  return m
}

export function ID(m: TimerModel): number {
  return m.id
}

export function Running(m: TimerModel): boolean {
  if (m.timedOut || !m.running) return false
  return true
}

export function Timedout(m: TimerModel): boolean {
  return m.timedOut
}

export function Init(m: TimerModel): Cmd {
  return tickCmd(m)
}

export function Start(m: TimerModel): [TimerModel, Cmd] {
  return [{ ...m, running: true }, startStopCmd(m.id, true)]
}

export function Stop(m: TimerModel): [TimerModel, Cmd] {
  return [{ ...m, running: false }, startStopCmd(m.id, false)]
}

export function Toggle(m: TimerModel): [TimerModel, Cmd] {
  if (Running(m)) return Stop(m)
  return Start(m)
}

export function Elapsed(m: TimerModel): number {
  return m.elapsed
}

export function Reset(m: TimerModel): TimerModel {
  return { ...m, elapsed: 0, running: false, timedOut: false, tag: 0 }
}

export function Update(m: TimerModel, msg: Msg): [TimerModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "timerStartStop": {
      const smsg = msg as StartStopMsg
      if (smsg.id !== 0 && smsg.id !== m.id) return [m, null]
      const newM = { ...m, running: smsg.running }
      return [newM, tickCmd(newM)]
    }
    case "timerTick": {
      const tmsg = msg as TickMsg
      if (!Running(m) || (tmsg.id !== 0 && tmsg.id !== m.id)) return [m, null]
      if (tmsg.tag > 0 && tmsg.tag !== m.tag) return [m, null]
      const newElapsed = m.elapsed + m.interval
      const newTimedOut = newElapsed >= m.timeout
      const newM: TimerModel = {
        ...m,
        elapsed: Math.min(newElapsed, m.timeout),
        timedOut: newTimedOut,
        tag: m.tag + 1,
      }
      return [newM, newTimedOut ? timeoutCmd(m.id) : tickCmd(newM)]
    }
    default:
      return [m, null]
  }
}

export function View(m: TimerModel): string {
  const remaining = Math.max(0, m.timeout - m.elapsed)
  return formatDuration(remaining)
}

function tickCmd(m: TimerModel): Cmd {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "timerTick", id: m.id, timeout: m.timedOut, tag: m.tag } as TickMsg)
      }, m.interval)
    })
}

function timeoutCmd(id: number): Cmd {
  return () =>
    new Promise((resolve) => {
      resolve({ type: "timerTimeout", id } as TimeoutMsg)
    })
}

function startStopCmd(id: number, running: boolean): Cmd {
  return () =>
    new Promise((resolve) => {
      resolve({ type: "timerStartStop", id, running } as StartStopMsg)
    })
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, "0")}m${String(seconds).padStart(2, "0")}s`
  }
  if (minutes > 0) {
    return `${minutes}m${String(seconds).padStart(2, "0")}s`
  }
  return `${seconds}s`
}
