// stopwatch.ts | stopwatch component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"

declare const setTimeout: any

let stopwatchId = 0

export type Option = (m: StopwatchModel) => void

export function WithInterval(interval: number): Option {
  return (m) => {
    m.interval = interval
  }
}

export interface TickMsg {
  type: "stopwatchTick"
  id: number
  tag: number
}

export interface StartStopMsg {
  type: "stopwatchStartStop"
  id: number
  running: boolean
}

export interface ResetMsg {
  type: "stopwatchReset"
  id: number
}

export interface StopwatchModel {
  id: number
  interval: number
  elapsed: number
  running: boolean
  tag: number
}

export function Stopwatch(...opts: Option[]): StopwatchModel {
  const m: StopwatchModel = {
    id: stopwatchId++,
    interval: 100,
    elapsed: 0,
    running: false,
    tag: 0,
  }
  for (const opt of opts) {
    opt(m)
  }
  return m
}

export function ID(m: StopwatchModel): number {
  return m.id
}

export function Init(m: StopwatchModel): Cmd {
  return Start_cmd(m)
}

export function Start(m: StopwatchModel): [StopwatchModel, Cmd] {
  return [{ ...m, running: true, tag: m.tag + 1 }, Start_cmd(m)]
}

function Start_cmd(m: StopwatchModel): Cmd {
  return () =>
    new Promise((resolve) => {
      resolve({ type: "stopwatchStartStop", id: m.id, running: true } as StartStopMsg)
    })
}

export function Stop(m: StopwatchModel): [StopwatchModel, Cmd] {
  return [{ ...m, running: false }, stopCmd(m.id)]
}

export function Toggle(m: StopwatchModel): [StopwatchModel, Cmd] {
  if (m.running) return Stop(m)
  return Start(m)
}

export function Reset(m: StopwatchModel): [StopwatchModel, Cmd] {
  return [{ ...m, elapsed: 0, running: false, tag: m.tag + 1 }, resetCmd(m.id)]
}

export function Running(m: StopwatchModel): boolean {
  return m.running
}

export function Elapsed(m: StopwatchModel): number {
  return m.elapsed
}

export function Update(m: StopwatchModel, msg: Msg): [StopwatchModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "stopwatchStartStop": {
      const smsg = msg as StartStopMsg
      if (smsg.id !== m.id) return [m, null]
      const newM = { ...m, running: smsg.running }
      return [newM, newM.running ? tickCmd(newM) : null]
    }
    case "stopwatchReset": {
      const rmsg = msg as ResetMsg
      if (rmsg.id !== m.id) return [m, null]
      return [{ ...m, elapsed: 0 }, null]
    }
    case "stopwatchTick": {
      const tmsg = msg as TickMsg
      if (!m.running || tmsg.id !== m.id) return [m, null]
      if (tmsg.tag > 0 && tmsg.tag !== m.tag) return [m, null]
      const newM = { ...m, elapsed: m.elapsed + m.interval, tag: m.tag + 1 }
      return [newM, tickCmd(newM)]
    }
    default:
      return [m, null]
  }
}

export function View(m: StopwatchModel): string {
  return formatDuration(m.elapsed)
}

function tickCmd(m: StopwatchModel): Cmd {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "stopwatchTick", id: m.id, tag: m.tag } as TickMsg)
      }, m.interval)
    })
}

function stopCmd(id: number): Cmd {
  return () =>
    new Promise((resolve) => {
      resolve({ type: "stopwatchStartStop", id, running: false } as StartStopMsg)
    })
}

function resetCmd(id: number): Cmd {
  return () =>
    new Promise((resolve) => {
      resolve({ type: "stopwatchReset", id } as ResetMsg)
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
