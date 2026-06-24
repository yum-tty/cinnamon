// progress.ts | progress bar component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"

/**
 * Option is a configuration option for Progress().
 */
export type Option = (m: ProgressModel) => void

/**
 * WithWidth sets the initial width.
 */
export function WithWidth(width: number): Option {
  return (m) => {
    m.width = width
  }
}

/**
 * WithColors sets the fill and empty colors.
 */
export function WithColors(filled: Style, empty: Style): Option {
  return (m) => {
    m.styles = { ...m.styles, filled, empty }
  }
}

/**
 * WithFillCharacters sets the fill characters.
 */
export function WithFillCharacters(filled: string, empty: string): Option {
  return (m) => {
    m.filled = filled
    m.empty = empty
  }
}

/**
 * WithoutPercentage hides the percentage display.
 */
export function WithoutPercentage(): Option {
  return (m) => {
    m.showPercentage = false
  }
}

/**
 * FrameMsg is sent for animation frames.
 */
export interface FrameMsg {
  type: "progressFrame"
  id: number
  tag: number
}

/**
 * ProgressModel is the state for the progress bar.
 */
export interface ProgressModel {
  value: number
  total: number
  width: number
  filled: string
  empty: string
  showPercentage: boolean
  id: number
  tag: number
  animating: boolean
  targetPercent: number
  styles: {
    bar: Style
    filled: Style
    empty: Style
    percent: Style
  }
}

let lastID = 0

/**
 * Progress creates a new progress bar model.
 */
export function Progress(width: number, opts?: Option[]): ProgressModel {
  const m: ProgressModel = {
    value: 0,
    total: 100,
    width,
    filled: "█",
    empty: "░",
    showPercentage: true,
    id: ++lastID,
    tag: 0,
    animating: false,
    targetPercent: 0,
    styles: {
      bar: Style(),
      filled: Style().foreground("#7f00ff"),
      empty: Style().foreground("#333333"),
      percent: Style().foreground("#AAAAAA"),
    },
  }
  if (opts) {
    for (const opt of opts) {
      opt(m)
    }
  }
  return m
}

/**
 * Init initializes the progress bar.
 */
export function Init(_m: ProgressModel): Cmd {
  return null
}

/**
 * Update handles messages.
 */
export function Update(m: ProgressModel, msg: Msg): [ProgressModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "progressFrame": {
      const fm = msg as FrameMsg
      if (fm.id !== m.id || fm.tag !== m.tag) return [m, null]
      const diff = m.targetPercent - m.value
      if (Math.abs(diff) < 0.5) {
        return [{ ...m, value: m.targetPercent, animating: false }, null]
      }
      const newValue = m.value + diff * 0.3
      return [
        { ...m, value: newValue, tag: m.tag + 1 },
        frameCmd(m.id, m.tag + 1),
      ]
    }
    default:
      return [m, null]
  }
}

/**
 * Percent returns the current percentage.
 */
export function Percent(m: ProgressModel): number {
  return m.value
}

/**
 * SetPercent sets the target percentage (0-100).
 */
export function SetPercent(m: ProgressModel, percent: number): [ProgressModel, Cmd] {
  const clamped = Math.max(0, Math.min(100, percent))
  return [
    { ...m, targetPercent: clamped, animating: true, tag: m.tag + 1 },
    frameCmd(m.id, m.tag + 1),
  ]
}

/**
 * SetProgress sets the progress bar to a value.
 */
export function SetProgress(m: ProgressModel, value: number, total: number): [ProgressModel, Cmd] {
  const percent = total > 0 ? (value / total) * 100 : 0
  return SetPercent(m, percent)
}

/**
 * IncrPercent increments the percentage by v.
 */
export function IncrPercent(m: ProgressModel, v: number): [ProgressModel, Cmd] {
  return SetPercent(m, m.targetPercent + v)
}

/**
 * DecrPercent decrements the percentage by v.
 */
export function DecrPercent(m: ProgressModel, v: number): [ProgressModel, Cmd] {
  return SetPercent(m, m.targetPercent - v)
}

/**
 * IsAnimating returns whether the progress bar is animating.
 */
export function IsAnimating(m: ProgressModel): boolean {
  return m.animating
}

/**
 * SetWidth sets the progress bar width.
 */
export function SetWidth(m: ProgressModel, width: number): ProgressModel {
  return { ...m, width }
}

/**
 * Width returns the progress bar width.
 */
export function Width(m: ProgressModel): number {
  return m.width
}

/**
 * ViewAs renders the progress bar at a specific percentage.
 */
export function ViewAs(m: ProgressModel, percent: number): string {
  const filledCount = Math.round((percent / 100) * m.width)
  const emptyCount = m.width - filledCount

  const filled = m.styles.filled.render(m.filled.repeat(filledCount))
  const empty = m.styles.empty.render(m.empty.repeat(emptyCount))
  const percentStr = m.showPercentage
    ? m.styles.percent.render(` ${Math.round(percent)}%`)
    : ""

  return m.styles.bar.render(filled + empty + percentStr)
}

/**
 * View renders the progress bar.
 */
export function View(m: ProgressModel): string {
  return ViewAs(m, m.value)
}

function frameCmd(id: number, tag: number): Cmd {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "progressFrame", id, tag } as FrameMsg)
      }, 16)
    })
}
