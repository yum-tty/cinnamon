// progress.ts | progress bar component (bubbles port)

import type { Model, Msg, Cmd } from "@yum-tty/cinnamon-bun"
import { NewStyle, type Style as StyleType, getStringWidth, colorToAnsi } from "@yum-tty/caramel"

export const DefaultFullCharHalfBlock = "\u258C"
export const DefaultFullCharFullBlock = "\u2588"
export const DefaultEmptyCharBlock = "\u2591"

export type ColorFunc = (total: number, current: number) => string

export type Option = (m: ProgressModel) => void

export function WithDefaultBlend(): Option {
  return WithColors("#5A56E0", "#EE6FF8")
}

export function WithColors(...colors: string[]): Option {
  return (m) => {
    if (colors.length === 0) {
      m.fullColor = "#7571F9"
      m.blend = []
      m.colorFunc = null
      return
    }
    if (colors.length === 1) {
      m.fullColor = colors[0]!
      m.blend = []
      m.colorFunc = null
      return
    }
    m.blend = [...colors]
    m.colorFunc = null
  }
}

export function WithColorFunc(fn: ColorFunc): Option {
  return (m) => {
    m.colorFunc = fn
    m.blend = []
  }
}

export function WithFillCharacters(full: string, empty: string): Option {
  return (m) => {
    m.full = full
    m.empty = empty
  }
}

export function WithoutPercentage(): Option {
  return (m) => {
    m.showPercentage = false
  }
}

export function WithWidth(w: number): Option {
  return (m) => {
    m.width = w
  }
}

export function WithSpringOptions(frequency: number, damping: number): Option {
  return (m) => {
    m.springFrequency = frequency
    m.springDamping = damping
    m.springCustomized = true
  }
}

export function WithScaled(enabled: boolean): Option {
  return (m) => {
    m.scaleBlend = enabled
  }
}

export interface FrameMsg {
  type: "progressFrame"
  id: number
  tag: number
}

export interface ProgressModel {
  id: number
  tag: number
  width: number
  full: string
  fullColor: string
  empty: string
  emptyColor: string
  showPercentage: boolean
  percentFormat: string
  percentStyle: StyleType
  percentShown: number
  targetPercent: number
  velocity: number
  springFrequency: number
  springDamping: number
  springCustomized: boolean
  blend: string[]
  scaleBlend: boolean
  colorFunc: ColorFunc | null
}

let lastID = 0

export function Progress({ width }: { width: number }, ...opts: Option[]): ProgressModel {
  const m: ProgressModel = {
    id: ++lastID,
    tag: 0,
    width,
    full: DefaultFullCharHalfBlock,
    fullColor: "#7571F9",
    empty: DefaultEmptyCharBlock,
    emptyColor: "#606060",
    showPercentage: true,
    percentFormat: " %3.0f%%",
    percentStyle: NewStyle().foreground("#AAAAAA"),
    percentShown: 0,
    targetPercent: 0,
    velocity: 0,
    springFrequency: 18.0,
    springDamping: 1.0,
    springCustomized: false,
    blend: [],
    scaleBlend: false,
    colorFunc: null,
  }
  for (const opt of opts) {
    opt(m)
  }
  return m
}

export function Init(_m: ProgressModel): Cmd {
  return null
}

export function Update(m: ProgressModel, msg: Msg): [ProgressModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "progressFrame": {
      const fm = msg as FrameMsg
      if (fm.id !== m.id || fm.tag !== m.tag) return [m, null]
      if (!IsAnimating(m)) return [m, null]
      const diff = m.targetPercent - m.percentShown
      const freq = m.springFrequency
      const damp = m.springDamping
      const newPercent = m.percentShown + diff * freq * 0.01 + m.velocity * 0.01
      const newVelocity = (m.velocity - diff * freq * damp * 0.01) * 0.99
      return [
        { ...m, percentShown: newPercent, velocity: newVelocity, tag: m.tag + 1 },
        frameCmd(m.id, m.tag + 1),
      ]
    }
    default:
      return [m, null]
  }
}

export function Percent(m: ProgressModel): number {
  return m.targetPercent
}

export function SetPercent(m: ProgressModel, p: number): [ProgressModel, Cmd] {
  const clamped = Math.max(0, Math.min(1, p))
  return [
    { ...m, targetPercent: clamped, tag: m.tag + 1 },
    frameCmd(m.id, m.tag + 1),
  ]
}

export function SetProgress(m: ProgressModel, value: number, total: number): [ProgressModel, Cmd] {
  const percent = total > 0 ? value / total : 0
  return SetPercent(m, percent)
}

export function IncrPercent(m: ProgressModel, v: number): [ProgressModel, Cmd] {
  return SetPercent(m, m.targetPercent + v)
}

export function DecrPercent(m: ProgressModel, v: number): [ProgressModel, Cmd] {
  return SetPercent(m, m.targetPercent - v)
}

export function IsAnimating(m: ProgressModel): boolean {
  return !(Math.abs(m.percentShown - m.targetPercent) < 0.001 && m.velocity < 0.01)
}

export function SetWidth(m: ProgressModel, w: number): ProgressModel {
  return { ...m, width: w }
}

export function Width(m: ProgressModel): number {
  return m.width
}

export function SetSpringOptions(m: ProgressModel, frequency: number, damping: number): ProgressModel {
  return { ...m, springFrequency: frequency, springDamping: damping, springCustomized: true }
}

export function View(m: ProgressModel): string {
  return ViewAs(m, m.percentShown)
}

export function ViewAs(m: ProgressModel, percent: number): string {
  const percentView = percentageView(m, percent)
  const bar = barView(m, percent, getStringWidth(percentView))
  return bar + percentView
}

function renderChar(ch: string, fg: string, bg?: string): string {
  const fgCode = colorToAnsi(fg, "38")
  let s = `\x1b[${fgCode}m${ch}\x1b[0m`
  if (bg) {
    const bgCode = colorToAnsi(bg, "48")
    s = `\x1b[${fgCode};${bgCode}m${ch}\x1b[0m`
  }
  return s
}

function barView(m: ProgressModel, percent: number, textWidth: number): string {
  const tw = Math.max(0, m.width - textWidth)
  const fw = Math.max(0, Math.min(tw, Math.round(tw * percent)))
  const isHalfBlock = m.full === DefaultFullCharHalfBlock
  let result = ""

  if (m.colorFunc) {
    for (let i = 0; i < fw; i++) {
      const current = tw > 0 ? i / tw : 0
      const fg = m.colorFunc(percent, current)
      if (isHalfBlock) {
        const bg = m.colorFunc(percent, Math.min(current + 0.5 / tw, 1))
        result += renderChar(m.full, fg, bg)
      } else {
        result += renderChar(m.full, fg)
      }
    }
  } else if (m.blend.length > 0) {
    const multiplier = isHalfBlock ? 2 : 1
    const blendWidth = m.scaleBlend ? fw * multiplier : tw * multiplier
    const blend = blend1D(m.blend, blendWidth)

    let blendIdx = 0
    for (let i = 0; i < fw; i++) {
      if (!isHalfBlock) {
        result += renderChar(m.full, blend[blendIdx % blend.length]!)
        blendIdx++
      } else {
        result += renderChar(m.full, blend[blendIdx % blend.length]!, blend[(blendIdx + 1) % blend.length]!)
        blendIdx += 2
      }
    }
  } else {
    const fgCode = colorToAnsi(m.fullColor, "38")
    result += `\x1b[${fgCode}m${m.full.repeat(fw)}\x1b[0m`
  }

  const n = Math.max(0, tw - fw)
  if (n > 0) {
    const emptyCode = colorToAnsi(m.emptyColor, "38")
    result += `\x1b[${emptyCode}m${m.empty.repeat(n)}\x1b[0m`
  }
  return result
}

function percentageView(m: ProgressModel, percent: number): string {
  if (!m.showPercentage) return ""
  const p = Math.max(0, Math.min(1, percent))
  const pct = m.percentFormat.replace("%3.0f%%", `${Math.round(p * 100)}%`)
  return m.percentStyle.inline(true).render(pct)
}

function blend1D(colors: string[], steps: number): string[] {
  if (colors.length < 2) return colors
  if (steps <= 0) return []
  const result: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1)
    const idx = t * (colors.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, colors.length - 1)
    const frac = idx - lo
    result.push(interpolateColor(colors[lo]!, colors[hi]!, frac))
  }
  return result
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16)
  const g1 = parseInt(c1.slice(3, 5), 16)
  const b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16)
  const g2 = parseInt(c2.slice(3, 5), 16)
  const b2 = parseInt(c2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function frameCmd(id: number, tag: number): Cmd {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "progressFrame", id, tag } as FrameMsg)
      }, 16)
    })
}
