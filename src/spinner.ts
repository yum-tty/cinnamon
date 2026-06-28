// spinner.ts | spinner component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"

declare const setTimeout: any

let lastID = 0
function nextID(): number {
  return ++lastID
}

/**
 * Spinner types with frames and FPS.
 */
export const spinners = {
  line: { frames: ["|", "/", "-", "\\"], fps: 10 },
  dot: { frames: ["\u28FE ", "\u28FD ", "\u28FB ", "\u28BF ", "\u287F ", "\u28DF ", "\u28EF ", "\u28F7 "], fps: 10 },
  miniDot: { frames: ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"], fps: 12 },
  jump: { frames: ["\u2884", "\u2882", "\u2881", "\u2841", "\u2848", "\u2850", "\u2860"], fps: 10 },
  pulse: { frames: ["\u2588", "\u2593", "\u2592", "\u2591"], fps: 8 },
  points: { frames: ["\u2219\u2219\u2219", "\u25CF\u2219\u2219", "\u2219\u25CF\u2219", "\u2219\u2219\u25CF"], fps: 7 },
  moon: { frames: ["\uD83C\uDF11", "\uD83C\uDF12", "\uD83C\uDF13", "\uD83C\uDF14", "\uD83C\uDF15", "\uD83C\uDF16", "\uD83C\uDF17", "\uD83C\uDF18"], fps: 8 },
  globe: { frames: ["\uD83C\uDF0D", "\uD83C\uDF0E", "\uD83C\uDF0F"], fps: 4 },
  monkey: { frames: ["\uD83D\uDE49", "\uD83D\uDE4A", "\uD83D\uDE4B"], fps: 3 },
  meter: { frames: ["\u25B1\u25B1\u25B1", "\u25B0\u25B1\u25B1", "\u25B0\u25B0\u25B1", "\u25B0\u25B0\u25B0", "\u25B0\u25B0\u25B1", "\u25B0\u25B1\u25B1", "\u25B1\u25B1\u25B1"], fps: 7 },
  hamburger: { frames: ["\u2631", "\u2632", "\u2634", "\u2632"], fps: 3 },
  ellipsis: { frames: ["", ".", "..", "..."], fps: 3 },
} as const

export type SpinnerType = keyof typeof spinners

/**
 * TickMsg indicates that the timer has ticked and we should render a frame.
 */
export interface TickMsg {
  type: "spinnerTick"
  id: number
  tag: number
}

/**
 * SpinnerModel is the state for the spinner.
 */
export interface SpinnerModel {
  spinner: { frames: readonly string[]; fps: number }
  index: number
  style: Style
  suffix: string
  id: number
  tag: number
}

/**
 * Option is used to set options in Spinner. For example:
 *   Spinner(WithSpinner(dot), WithStyle(myStyle))
 */
export type Option = (m: SpinnerModel) => void

/**
 * WithSpinner is an option to set the spinner type. Pass this to Spinner().
 */
export function WithSpinner(type: SpinnerType): Option {
  return (m: SpinnerModel) => {
    m.spinner = spinners[type]
  }
}

/**
 * WithStyle is an option to set the spinner style. Pass this to Spinner().
 */
export function WithStyle(style: Style): Option {
  return (m: SpinnerModel) => {
    m.style = style
  }
}

/**
 * Spinner creates a new spinner model.
 */
export function Spinner(type: SpinnerType): SpinnerModel
export function Spinner(...opts: Option[]): SpinnerModel
export function Spinner(...args: any[]): SpinnerModel {
  const m: SpinnerModel = {
    spinner: spinners["line"],
    index: 0,
    style: new Style().foreground("#7f00ff"),
    suffix: "",
    id: nextID(),
    tag: 0,
  }
  if (args.length === 0 || typeof args[0] === "string") {
    const type: SpinnerType = (args[0] as SpinnerType) || "line"
    m.spinner = spinners[type]
  }
  for (const opt of args) {
    if (typeof opt === "function") opt(m)
  }
  return m
}

/**
 * ID returns the spinner's unique ID.
 */
export function ID(m: SpinnerModel): number {
  return m.id
}

/**
 * Tick advances the spinner by one frame and returns a command.
 */
export function Tick(m: SpinnerModel): [SpinnerModel, Cmd] {
  const newTag = m.tag + 1
  const newM = {
    ...m,
    index: (m.index + 1) % m.spinner.frames.length,
    tag: newTag,
  }
  return [newM, SpinCmd(newM)]
}

/**
 * Update handles spinner messages.
 */
export function Update(m: SpinnerModel, msg: Msg): [SpinnerModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "spinnerTick": {
      const tMsg = msg as TickMsg
      if (tMsg.id > 0 && tMsg.id !== m.id) return [m, null]
      if (tMsg.tag > 0 && tMsg.tag !== m.tag) return [m, null]

      const newTag = m.tag + 1
      const newM = {
        ...m,
        index: (m.index + 1) % m.spinner.frames.length,
        tag: newTag,
      }
      return [newM, SpinCmd(newM)]
    }
    default:
      return [m, null]
  }
}

/**
 * SpinCmd returns a command that sends a tick message after a delay.
 */
export function SpinCmd(m: SpinnerModel): Cmd {
  const fps = m.spinner.fps
  const interval = 1000 / fps
  const id = m.id
  const tag = m.tag

  return () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "spinnerTick", id, tag } as TickMsg)
      }, interval)
    })
  }
}

/**
 * View renders the spinner.
 */
export function View(m: SpinnerModel): string {
  const frame = m.spinner.frames[m.index % m.spinner.frames.length]!
  return m.style.render(frame) + m.suffix
}
