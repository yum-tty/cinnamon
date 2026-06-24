// viewport.ts | scrollable viewport component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

/**
 * ViewportKeyMap is the key bindings for the viewport.
 */
export interface ViewportKeyMap {
  PageDown: Binding
  PageUp: Binding
  HalfPageDown: Binding
  HalfPageUp: Binding
  Up: Binding
  Down: Binding
  Left: Binding
  Right: Binding
}

/**
 * DefaultViewportKeyMap returns the default key bindings.
 */
export function DefaultViewportKeyMap(): ViewportKeyMap {
  return {
    PageDown: NewBinding({ keys: ["pgdown", "ctrl+f", " "], help: "page down" }),
    PageUp: NewBinding({ keys: ["pgup", "ctrl+b"], help: "page up" }),
    HalfPageDown: NewBinding({ keys: ["ctrl+d"], help: "half page down" }),
    HalfPageUp: NewBinding({ keys: ["ctrl+u"], help: "half page up" }),
    Up: NewBinding({ keys: ["up", "k"], help: "up" }),
    Down: NewBinding({ keys: ["down", "j"], help: "down" }),
    Left: NewBinding({ keys: ["left", "h"], help: "scroll left" }),
    Right: NewBinding({ keys: ["right", "l"], help: "scroll right" }),
  }
}

/**
 * ViewportModel is the state for the viewport.
 */
export interface ViewportModel {
  content: string
  yOffset: number
  xOffset: number
  width: number
  height: number
  lines: string[]
  keyMap: ViewportKeyMap
  highlights: number[][]
  highlightIndex: number
}

/**
 * Viewport creates a new viewport model.
 */
export function Viewport(width: number, height: number): ViewportModel {
  return {
    content: "",
    yOffset: 0,
    xOffset: 0,
    width,
    height,
    lines: [],
    keyMap: DefaultViewportKeyMap(),
    highlights: [],
    highlightIndex: 0,
  }
}

/**
 * SetContent sets the viewport content.
 */
export function SetContent(m: ViewportModel, content: string): ViewportModel {
  const lines = content.split("\n")
  return { ...m, content, lines }
}

/**
 * GotoTop scrolls to the top.
 */
export function GotoTop(m: ViewportModel): ViewportModel {
  return { ...m, yOffset: 0 }
}

/**
 * GotoBottom scrolls to the bottom.
 */
export function GotoBottom(m: ViewportModel): ViewportModel {
  const maxOffset = Math.max(0, m.lines.length - m.height)
  return { ...m, yOffset: maxOffset }
}

/**
 * ScrollUp scrolls up by a number of lines.
 */
export function ScrollUp(m: ViewportModel, n: number = 1): ViewportModel {
  return { ...m, yOffset: Math.max(0, m.yOffset - n) }
}

/**
 * ScrollDown scrolls down by a number of lines.
 */
export function ScrollDown(m: ViewportModel, n: number = 1): ViewportModel {
  const maxOffset = Math.max(0, m.lines.length - m.height)
  return { ...m, yOffset: Math.min(maxOffset, m.yOffset + n) }
}

/**
 * Height returns the viewport height.
 */
export function Height(m: ViewportModel): number {
  return m.height
}

/**
 * SetHeight sets the viewport height.
 */
export function SetHeight(m: ViewportModel, height: number): ViewportModel {
  return { ...m, height }
}

/**
 * Width returns the viewport width.
 */
export function Width(m: ViewportModel): number {
  return m.width
}

/**
 * SetWidth sets the viewport width.
 */
export function SetWidth(m: ViewportModel, width: number): ViewportModel {
  return { ...m, width }
}

/**
 * AtTop returns whether the viewport is at the top.
 */
export function AtTop(m: ViewportModel): boolean {
  return m.yOffset === 0
}

/**
 * AtBottom returns whether the viewport is at the bottom.
 */
export function AtBottom(m: ViewportModel): boolean {
  return m.yOffset >= Math.max(0, m.lines.length - m.height)
}

/**
 * PastBottom returns whether the viewport has scrolled past the bottom.
 */
export function PastBottom(m: ViewportModel): boolean {
  return m.yOffset > Math.max(0, m.lines.length - m.height)
}

/**
 * ScrollPercent returns the scroll percentage (0-1).
 */
export function ScrollPercent(m: ViewportModel): number {
  const total = m.lines.length - m.height
  if (total <= 0) return 1
  return m.yOffset / total
}

/**
 * XOffset returns the horizontal scroll offset.
 */
export function XOffset(m: ViewportModel): number {
  return m.xOffset
}

/**
 * SetXOffset sets the horizontal scroll offset.
 */
export function SetXOffset(m: ViewportModel, offset: number): ViewportModel {
  return { ...m, xOffset: Math.max(0, offset) }
}

/**
 * ScrollLeft scrolls left by n characters.
 */
export function ScrollLeft(m: ViewportModel, n: number = 1): ViewportModel {
  return { ...m, xOffset: Math.max(0, m.xOffset - n) }
}

/**
 * ScrollRight scrolls right by n characters.
 */
export function ScrollRight(m: ViewportModel, n: number = 1): ViewportModel {
  return { ...m, xOffset: m.xOffset + n }
}

/**
 * TotalLineCount returns the total number of lines.
 */
export function TotalLineCount(m: ViewportModel): number {
  return m.lines.length
}

/**
 * VisibleLineCount returns the number of visible lines.
 */
export function VisibleLineCount(m: ViewportModel): number {
  return Math.min(m.height, m.lines.length)
}

/**
 * SetHighlights sets search highlights.
 */
export function SetHighlights(m: ViewportModel, matches: number[][]): ViewportModel {
  return { ...m, highlights: matches, highlightIndex: 0 }
}

/**
 * ClearHighlights clears all highlights.
 */
export function ClearHighlights(m: ViewportModel): ViewportModel {
  return { ...m, highlights: [], highlightIndex: 0 }
}

/**
 * HighlightNext moves to the next highlight.
 */
export function HighlightNext(m: ViewportModel): ViewportModel {
  if (m.highlights.length === 0) return m
  const nextIndex = (m.highlightIndex + 1) % m.highlights.length
  return { ...m, highlightIndex: nextIndex }
}

/**
 * HighlightPrevious moves to the previous highlight.
 */
export function HighlightPrevious(m: ViewportModel): ViewportModel {
  if (m.highlights.length === 0) return m
  const prevIndex = (m.highlightIndex - 1 + m.highlights.length) % m.highlights.length
  return { ...m, highlightIndex: prevIndex }
}

/**
 * Update handles keyboard input.
 */
export function Update(m: ViewportModel, msg: Msg): [ViewportModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]
  if (msg.type !== "key") return [m, null]

  const key = msg as any

  if (Matches(m.keyMap.PageDown as any, key)) {
    return [ScrollDown(m, m.height), null]
  }
  if (Matches(m.keyMap.PageUp as any, key)) {
    return [ScrollUp(m, m.height), null]
  }
  if (Matches(m.keyMap.HalfPageDown as any, key)) {
    return [ScrollDown(m, Math.floor(m.height / 2)), null]
  }
  if (Matches(m.keyMap.HalfPageUp as any, key)) {
    return [ScrollUp(m, Math.floor(m.height / 2)), null]
  }
  if (Matches(m.keyMap.Down as any, key)) {
    return [ScrollDown(m, 1), null]
  }
  if (Matches(m.keyMap.Up as any, key)) {
    return [ScrollUp(m, 1), null]
  }
  if (Matches(m.keyMap.Left as any, key)) {
    return [ScrollLeft(m, 1), null]
  }
  if (Matches(m.keyMap.Right as any, key)) {
    return [ScrollRight(m, 1), null]
  }

  return [m, null]
}

/**
 * View renders the viewport.
 */
export function View(m: ViewportModel): string {
  const visibleLines = m.lines.slice(m.yOffset, m.yOffset + m.height)
  const padded = [...visibleLines]

  while (padded.length < m.height) {
    padded.push("")
  }

  return padded.join("\n")
}
