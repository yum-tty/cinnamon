// cursor.ts | virtual cursor (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"

/**
 * CursorMode describes the behavior of the cursor.
 */
export type CursorMode = "blink" | "static" | "hide"

/**
 * CursorModel is the state for the cursor.
 */
export interface CursorModel {
  style: Style
  textStyle: Style
  blinkSpeed: number
  isBlinked: boolean
  char: string
  focused: boolean
  mode: CursorMode
  blinkTag: number
}

/**
 * Cursor creates a new cursor model.
 */
export function Cursor(): CursorModel {
  return {
    style: Style().reverse(true),
    textStyle: Style(),
    blinkSpeed: 530,
    isBlinked: true,
    char: " ",
    focused: false,
    mode: "blink",
    blinkTag: 0,
  }
}

/**
 * SetMode sets the cursor mode.
 */
export function SetMode(m: CursorModel, mode: CursorMode): [CursorModel, Cmd] {
  const newMode = { ...m, mode }
  newMode.isBlinked = mode === "hide" || !m.focused

  if (mode === "blink") {
    return [newMode, Blink]
  }
  return [newMode, null]
}

/**
 * Focus focuses the cursor.
 */
export function Focus(m: CursorModel): [CursorModel, Cmd] {
  const newM = { ...m, focused: true, isBlinked: m.mode === "hide" }

  if (m.mode === "blink" && newM.focused) {
    return [newM, Blink]
  }
  return [newM, null]
}

/**
 * Blur blurs the cursor.
 */
export function Blur(m: CursorModel): CursorModel {
  return { ...m, focused: false, isBlinked: true }
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
      return [m, m.BlinkCmd()]

    case "focus":
      return Focus(m)

    case "blur":
      return [Blur(m), null]

    case "blink":
      if (m.mode !== "blink" || !m.focused) return [m, null]
      if ((msg as any).tag !== m.blinkTag) return [m, null]

      const newM = { ...m, isBlinked: !m.isBlinked }
      return [newM, newM.BlinkCmd()]

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
  const speed = m.blinkSpeed

  return () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ type: "blink", tag } as any)
      }, speed)
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
