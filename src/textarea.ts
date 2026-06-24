// textarea.ts | multi-line text input (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { Cursor, type CursorModel, Focus as CursorFocus, Blur as CursorBlur, SetChar, Update as CursorUpdate, View as CursorView } from "./cursor"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

/**
 * TextareaKeyMap is the key bindings for the textarea.
 */
export interface TextareaKeyMap {
  CharacterForward: Binding
  CharacterBackward: Binding
  WordForward: Binding
  WordBackward: Binding
  DeleteWordBackward: Binding
  DeleteWordForward: Binding
  DeleteAfterCursor: Binding
  DeleteBeforeCursor: Binding
  DeleteCharacterBackward: Binding
  DeleteCharacterForward: Binding
  LineStart: Binding
  LineEnd: Binding
  Paste: Binding
  Enter: Binding
}

/**
 * DefaultTextareaKeyMap returns the default key bindings.
 */
export function DefaultTextareaKeyMap(): TextareaKeyMap {
  return {
    CharacterForward: NewBinding({ keys: ["right", "ctrl+f"], help: "move forward" }),
    CharacterBackward: NewBinding({ keys: ["left", "ctrl+b"], help: "move backward" }),
    WordForward: NewBinding({ keys: ["alt+right", "ctrl+right"], help: "word forward" }),
    WordBackward: NewBinding({ keys: ["alt+left", "ctrl+left"], help: "word backward" }),
    DeleteWordBackward: NewBinding({ keys: ["alt+backspace", "ctrl+w"], help: "delete word backward" }),
    DeleteWordForward: NewBinding({ keys: ["alt+delete", "alt+d"], help: "delete word forward" }),
    DeleteAfterCursor: NewBinding({ keys: ["ctrl+k"], help: "delete after cursor" }),
    DeleteBeforeCursor: NewBinding({ keys: ["ctrl+u"], help: "delete before cursor" }),
    DeleteCharacterBackward: NewBinding({ keys: ["backspace", "ctrl+h"], help: "delete backward" }),
    DeleteCharacterForward: NewBinding({ keys: ["delete", "ctrl+d"], help: "delete forward" }),
    LineStart: NewBinding({ keys: ["home", "ctrl+a"], help: "go to start" }),
    LineEnd: NewBinding({ keys: ["end", "ctrl+e"], help: "go to end" }),
    Paste: NewBinding({ keys: ["ctrl+v"], help: "paste" }),
    Enter: NewBinding({ keys: ["enter"], help: "new line" }),
  }
}

/**
 * TextareaModel is the state for the textarea.
 */
export interface TextareaModel {
  value: string
  cursor: number
  width: number
  height: number
  focused: boolean
  keyMap: TextareaKeyMap
  charLimit: number
  maxLines: number
  virtualCursor: CursorModel
}

/**
 * Textarea creates a new textarea model.
 */
export function Textarea(width: number, height: number): TextareaModel {
  return {
    value: "",
    cursor: 0,
    width,
    height,
    focused: false,
    keyMap: DefaultTextareaKeyMap(),
    charLimit: 0,
    maxLines: 0,
    virtualCursor: Cursor(),
  }
}

/**
 * SetValue sets the value.
 */
export function SetValue(m: TextareaModel, value: string): TextareaModel {
  return { ...m, value, cursor: value.length }
}

/**
 * Focus focuses the textarea.
 */
export function Focus(m: TextareaModel): [TextareaModel, Cmd] {
  const [vc, cmd] = CursorFocus(m.virtualCursor)
  return [{ ...m, focused: true, virtualCursor: vc }, cmd]
}

/**
 * Blur blurs the textarea.
 */
export function Blur(m: TextareaModel): [TextareaModel, Cmd] {
  const vc = CursorBlur(m.virtualCursor)
  return [{ ...m, focused: false, virtualCursor: vc }, null]
}

/**
 * Update handles keyboard input.
 */
export function Update(m: TextareaModel, msg: Msg): [TextareaModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  // Handle cursor messages
  if (["blink", "initialBlink", "blinkCanceled"].includes(msg.type)) {
    const [vc, cmd] = CursorUpdate(m.virtualCursor, msg)
    return [{ ...m, virtualCursor: vc }, cmd]
  }

  if (msg.type !== "key") return [m, null]
  if (!m.focused) return [m, null]

  const key = msg as any
  let newValue = m.value
  let newCursor = m.cursor

  // Character forward
  if (Matches(m.keyMap.CharacterForward as any, key)) {
    newCursor = Math.min(m.value.length, m.cursor + 1)
  }
  // Character backward
  else if (Matches(m.keyMap.CharacterBackward as any, key)) {
    newCursor = Math.max(0, m.cursor - 1)
  }
  // Line start
  else if (Matches(m.keyMap.LineStart as any, key)) {
    // Find start of current line
    const before = m.value.slice(0, m.cursor)
    const lastNewline = before.lastIndexOf("\n")
    newCursor = lastNewline + 1
  }
  // Line end
  else if (Matches(m.keyMap.LineEnd as any, key)) {
    // Find end of current line
    const after = m.value.slice(m.cursor)
    const nextNewline = after.indexOf("\n")
    newCursor = nextNewline === -1 ? m.value.length : m.cursor + nextNewline
  }
  // Enter
  else if (Matches(m.keyMap.Enter as any, key)) {
    if (m.maxLines === 0 || m.value.split("\n").length < m.maxLines) {
      newValue = m.value.slice(0, m.cursor) + "\n" + m.value.slice(m.cursor)
      newCursor = m.cursor + 1
    }
  }
  // Delete character backward
  else if (Matches(m.keyMap.DeleteCharacterBackward as any, key)) {
    if (m.cursor > 0) {
      newValue = m.value.slice(0, m.cursor - 1) + m.value.slice(m.cursor)
      newCursor = m.cursor - 1
    }
  }
  // Delete character forward
  else if (Matches(m.keyMap.DeleteCharacterForward as any, key)) {
    if (m.cursor < m.value.length) {
      newValue = m.value.slice(0, m.cursor) + m.value.slice(m.cursor + 1)
    }
  }
  // Delete word backward
  else if (Matches(m.keyMap.DeleteWordBackward as any, key)) {
    if (m.cursor > 0) {
      const before = m.value.slice(0, m.cursor)
      const after = m.value.slice(m.cursor)
      const lastSpace = before.lastIndexOf(" ")
      const lastNewline = before.lastIndexOf("\n")
      const pos = Math.max(lastSpace, lastNewline)
      newValue = m.value.slice(0, pos + 1) + after
      newCursor = pos + 1
    }
  }
  // Delete word forward
  else if (Matches(m.keyMap.DeleteWordForward as any, key)) {
    if (m.cursor < m.value.length) {
      const before = m.value.slice(0, m.cursor)
      const after = m.value.slice(m.cursor)
      const nextSpace = after.indexOf(" ")
      const nextNewline = after.indexOf("\n")
      const pos = nextSpace === -1
        ? (nextNewline === -1 ? after.length : nextNewline)
        : (nextNewline === -1 ? nextSpace : Math.min(nextSpace, nextNewline))
      newValue = before + m.value.slice(m.cursor + pos + 1)
    }
  }
  // Delete after cursor
  else if (Matches(m.keyMap.DeleteAfterCursor as any, key)) {
    newValue = m.value.slice(0, m.cursor)
  }
  // Delete before cursor
  else if (Matches(m.keyMap.DeleteBeforeCursor as any, key)) {
    newValue = m.value.slice(m.cursor)
    newCursor = 0
  }
  // Regular character
  else if (key.name && key.name.length === 1 && !key.ctrl && !key.alt) {
    if (m.charLimit === 0 || m.value.length < m.charLimit) {
      newValue = m.value.slice(0, m.cursor) + key.name + m.value.slice(m.cursor)
      newCursor = m.cursor + 1
    }
  }

  // Update cursor character
  const char = newValue[newCursor] || " "
  const newVC = SetChar(m.virtualCursor, char)

  return [{
    ...m,
    value: newValue,
    cursor: newCursor,
    virtualCursor: newVC,
  }, null]
}

/**
 * View renders the textarea.
 */
export function View(m: TextareaModel): string {
  const lines = m.value.split("\n")
  const visibleLines = lines.slice(0, m.height)

  const result: string[] = []
  for (let i = 0; i < m.height; i++) {
    if (i < visibleLines.length) {
      result.push(visibleLines[i]!)
    } else {
      result.push("")
    }
  }

  return result.join("\n")
}
