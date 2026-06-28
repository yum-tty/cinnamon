// cursor.ts | virtual cursor (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { NewStyle, type Style as StyleType } from "caramel"

declare const setTimeout: any
declare const clearTimeout: any

let lastID = 0
function nextID(): number {
  return ++lastID
}

const blinkTimers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * CursorMode describes the behavior of the cursor.
 */
export type CursorMode = "blink" | "static" | "hide"

/**
 * Numeric cursor mode constants for Go compatibility.
 */
export const CursorBlink = 0
export const CursorStatic = 1
export const CursorHide = 2

/**
 * Converts a numeric mode constant to a CursorMode string.
 */
export function numericModeToCursorMode(mode: number): CursorMode {
  switch (mode) {
    case CursorBlink: return "blink"
    case CursorStatic: return "static"
    case CursorHide: return "hide"
    default: return "blink"
  }
}

/**
 * BlinkMsg signals that the cursor should blink.
 */
export interface BlinkMsg {
  type: "blink"
  id: number
  tag: number
}

/**
 * CursorModel is the state for the cursor.
 */
export interface CursorModel {
  style: StyleType
  textStyle: StyleType
  blinkSpeed: number
  isBlinked: boolean
  char: string
  focused: boolean
  mode: CursorMode
  id: number
  blinkTag: number
  blinkTimer: any
}

/**
 * Cursor creates a new cursor model.
 */
export function Cursor(): CursorModel {
  return {
    style: NewStyle().reverse(true),
    textStyle: NewStyle(),
    blinkSpeed: 530,
    isBlinked: true,
    char: " ",
    focused: false,
    mode: "blink",
    id: nextID(),
    blinkTag: 0,
    blinkTimer: null,
  }
}

/**
 * SetMode sets the cursor mode.
 */
export function SetMode(m: CursorModel, mode: CursorMode): [CursorModel, Cmd] {
  const newMode = { ...m, mode }
  newMode.isBlinked = mode === "hide" || !m.focused

  if (mode === "blink") {
    return [newMode, BlinkCmd(newMode)]
  }
  cancelBlink(newMode)
  return [newMode, null]
}

function cancelBlink(m: CursorModel): CursorModel {
  if (!m) return Cursor()
  const timer = blinkTimers.get(m.id)
  if (timer != null) {
    clearTimeout(timer)
    blinkTimers.delete(m.id)
    return { ...m, blinkTimer: null }
  }
  return m
}

/**
 * Focus focuses the cursor.
 */
export function Focus(m: CursorModel): [CursorModel, Cmd] {
  const newM = { ...m, focused: true, isBlinked: m.mode === "hide" }

  if (m.mode === "blink" && newM.focused) {
    return [newM, BlinkCmd(newM)]
  }
  return [newM, null]
}

/**
 * Blur blurs the cursor.
 */
export function Blur(m: CursorModel): CursorModel {
  const cancelled = cancelBlink(m)
  return { ...cancelled, focused: false, isBlinked: true }
}

/**
 * SetChar sets the character under the cursor.
 */
export function SetChar(m: CursorModel, char: string): CursorModel {
  return { ...m, char }
}

/**
 * Update handles cursor messages.
 */
export function Update(m: CursorModel, msg: Msg): [CursorModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  switch (msg.type) {
    case "initialBlink":
      if (m.mode !== "blink" || !m.focused) return [m, null]
      return [m, BlinkCmd(m)]

    case "focus":
      return Focus(m)

    case "blur":
      return [Blur(m), null]

    case "blink": {
      const bMsg = msg as BlinkMsg
      if (m.mode !== "blink" || !m.focused) return [m, null]
      if (bMsg.id !== m.id || bMsg.tag !== m.blinkTag) return [m, null]

      const newM = { ...m, isBlinked: !m.isBlinked }
      return [newM, BlinkCmd(newM)]
    }

    case "blinkCanceled":
      return [m, null]

    default:
      return [m, null]
  }
}

/**
 * BlinkCmd returns a command that sends a blink message after a delay.
 */
export function BlinkCmd(m: CursorModel): Cmd {
  if (m.mode !== "blink") return null

  const tag = m.blinkTag + 1
  const id = m.id
  const speed = m.blinkSpeed

  return () => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        blinkTimers.delete(id)
        resolve({ type: "blink", id, tag } as BlinkMsg)
      }, speed)
      blinkTimers.set(id, timer)
      return timer
    })
  }
}

/**
 * Blink initializes cursor blinking.
 */
export function Blink(): Msg {
  return { type: "initialBlink" } as any
}

/**
 * View renders the cursor.
 */
export function View(m: CursorModel): string {
  if (m.isBlinked) {
    return m.textStyle.inline(true).render(m.char)
  }
  return m.style.inline(true).render(m.char)
}
