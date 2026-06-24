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
