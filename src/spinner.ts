// spinner.ts | spinner component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"

/**
 * Spinner types with frames and FPS.
 */
export const spinners = {
  line: { frames: ["-", "\\", "|", "/"], fps: 10 },
  dot: { frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"], fps: 10 },
  miniDot: { frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], fps: 10 },
  jump: { frames: ["⢄", "⢂", "⢁", "⢀", "⠐", "⠈"], fps: 10 },
  pulse: { frames: ["█", "▓", "▒", "░"], fps: 10 },
  points: { frames: ["•   ", " *  ", "  * ", "   •", "  * ", " *  "], fps: 10 },
  glob: { frames: ["⢎⠀", "⢎⡀", "⢎⡄", "⢎⡇", "⢎⣇", "⢎⣧", "⢎⣷", "⢎⣾"], fps: 10 },
  moon: { frames: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"], fps: 10 },
  runner: { frames: ["🏃", "🏃‍♂️", "🏃‍♀️"], fps: 10 },
  earth: { frames: ["🌍", "🌎", "🌏"], fps: 10 },
} as const

export type SpinnerType = keyof typeof spinners

/**
 * SpinnerModel is the state for the spinner.
 */
export interface SpinnerModel {
  spinner: typeof spinners.line
  index: number
  style: Style
  suffix: string
}

/**
 * Spinner creates a new spinner model.
 */
export function Spinner(type: SpinnerType = "line"): SpinnerModel {
  return {
    spinner: spinners[type],
    index: 0,
    style: Style().foreground("#7f00ff"),
    suffix: "",
  }
}

/**
 * Tick advances the spinner by one frame.
 */
export function Tick(m: SpinnerModel): SpinnerModel {
  return {
    ...m,
    index: (m.index + 1) % m.spinner.frames.length,
  }
}

/**
 * Update handles spinner messages.
 */
export function Update(m: SpinnerModel, msg: Msg): [SpinnerModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "spinnerTick":
      return [Tick(m), SpinCmd(m)]
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

  return () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "spinnerTick" } as any)
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
