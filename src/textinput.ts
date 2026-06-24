// textinput.ts | text input component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { Cursor, type CursorModel, Focus as CursorFocus, Blur as CursorBlur, SetChar, Update as CursorUpdate, View as CursorView } from "./cursor"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

/**
 * EchoMode sets the input behavior.
 */
export type EchoMode = "normal" | "password" | "none"

/**
 * Styles for the text input.
 */
export interface TextInputStyles {
  base: Style
  focused: Style
  cursor: Style
  placeholder: Style
  suggestions: Style
}

/**
 * Default dark styles.
 */
export function DefaultDarkStyles(): TextInputStyles {
  return {
    base: Style().foreground("#AAAAAA"),
    focused: Style(),
    cursor: Style().reverse(true),
    placeholder: Style().dim(true).foreground("#666666"),
    suggestions: Style().dim(true).foreground("#7f00ff"),
  }
}

/**
 * Default light styles.
 */
export function DefaultLightStyles(): TextInputStyles {
  return {
    base: Style().foreground("#555555"),
    focused: Style(),
    cursor: Style().reverse(true),
    placeholder: Style().dim(true).foreground("#999999"),
    suggestions: Style().dim(true).foreground("#0066CC"),
  }
}

/**
 * Default key map.
 */
export function DefaultKeyMap(): KeyMap {
  return {
    CharacterForward: NewBinding({ keys: ["right", "ctrl+f"], help: "move forward" }),
    CharacterBackward: NewBinding({ keys: ["left", "ctrl+b"], help: "move backward" }),
    WordForward: NewBinding({ keys: ["alt+right", "ctrl+right", "alt+f"], help: "word forward" }),
    WordBackward: NewBinding({ keys: ["alt+left", "ctrl+left", "alt+b"], help: "word backward" }),
    DeleteWordBackward: NewBinding({ keys: ["alt+backspace", "ctrl+w"], help: "delete word backward" }),
    DeleteWordForward: NewBinding({ keys: ["alt+delete", "alt+d"], help: "delete word forward" }),
    DeleteAfterCursor: NewBinding({ keys: ["ctrl+k"], help: "delete after cursor" }),
    DeleteBeforeCursor: NewBinding({ keys: ["ctrl+u"], help: "delete before cursor" }),
    DeleteCharacterBackward: NewBinding({ keys: ["backspace", "ctrl+h"], help: "delete backward" }),
    DeleteCharacterForward: NewBinding({ keys: ["delete", "ctrl+d"], help: "delete forward" }),
    LineStart: NewBinding({ keys: ["home", "ctrl+a"], help: "go to start" }),
    LineEnd: NewBinding({ keys: ["end", "ctrl+e"], help: "go to end" }),
    Paste: NewBinding({ keys: ["ctrl+v"], help: "paste" }),
    AcceptSuggestion: NewBinding({ keys: ["tab"], help: "accept suggestion" }),
    NextSuggestion: NewBinding({ keys: ["down", "ctrl+n"], help: "next suggestion" }),
    PrevSuggestion: NewBinding({ keys: ["up", "ctrl+p"], help: "prev suggestion" }),
  }
}

/**
 * TextInputModel is the state for the text input.
 */
export interface TextInputModel {
  prompt: string
  placeholder: string
  echoMode: EchoMode
  echoCharacter: string
  charLimit: number
  width: number
  value: string
  cursor: number
  offset: number
  offsetRight: number
  focused: boolean
  styles: TextInputStyles
  keyMap: KeyMap
  validate: ((value: string) => boolean) | null
  err: string
  showSuggestions: boolean
  suggestions: string[]
  matchedSuggestions: string[]
  currentSuggestionIndex: number
  virtualCursor: CursorModel
}

/**
 * TextInput creates a new text input model.
 */
export function TextInput(): TextInputModel {
  return {
    prompt: "> ",
    placeholder: "",
    echoMode: "normal",
    echoCharacter: "*",
    charLimit: 0,
    width: 0,
    value: "",
    cursor: 0,
    offset: 0,
    offsetRight: 0,
    focused: false,
    styles: DefaultDarkStyles(),
    keyMap: DefaultKeyMap(),
    validate: null,
    err: "",
    showSuggestions: false,
    suggestions: [],
    matchedSuggestions: [],
    currentSuggestionIndex: 0,
    virtualCursor: Cursor(),
  }
}

/**
 * SetValue sets the value.
 */
export function SetValue(m: TextInputModel, value: string): TextInputModel {
  return { ...m, value, cursor: value.length }
}

/**
 * SetCursor sets the cursor position.
 */
export function SetCursorPos(m: TextInputModel, pos: number): TextInputModel {
  return { ...m, cursor: Math.max(0, Math.min(m.value.length, pos)) }
}

/**
 * Focus focuses the text input.
 */
export function Focus(m: TextInputModel): [TextInputModel, Cmd] {
  const [vc, cmd] = CursorFocus(m.virtualCursor)
  return [{ ...m, focused: true, virtualCursor: vc }, cmd]
}

/**
 * Blur blurs the text input.
 */
export function Blur(m: TextInputModel): [TextInputModel, Cmd] {
  const vc = CursorBlur(m.virtualCursor)
  return [{ ...m, focused: false, virtualCursor: vc }, null]
}

/**
 * Update handles keyboard input.
 */
export function Update(m: TextInputModel, msg: Msg): [TextInputModel, Cmd] {
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
  let newOffset = m.offset
  let newOffsetRight = m.offsetRight

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
    newCursor = 0
  }
  // Line end
  else if (Matches(m.keyMap.LineEnd as any, key)) {
    newCursor = m.value.length
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
      const words = before.split(/\s+/)
      words.pop()
      newValue = words.join(" ") + after
      newCursor = newValue.length - after.length
    }
  }
  // Delete word forward
  else if (Matches(m.keyMap.DeleteWordForward as any, key)) {
    if (m.cursor < m.value.length) {
      const before = m.value.slice(0, m.cursor)
      const after = m.value.slice(m.cursor)
      const words = after.split(/\s+/)
      words.shift()
      newValue = before + words.join(" ")
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
  // Paste
  else if (Matches(m.keyMap.Paste as any, key)) {
    // Paste would need clipboard access
    return [m, null]
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

  // Validate
  let err = ""
  if (m.validate) {
    const valid = m.validate(newValue)
    if (!valid) err = "invalid input"
  }

  return [{
    ...m,
    value: newValue,
    cursor: newCursor,
    offset: newOffset,
    offsetRight: newOffsetRight,
    virtualCursor: newVC,
    err,
  }, null]
}

/**
 * View renders the text input.
 */
export function View(m: TextInputModel): string {
  const style = m.focused ? m.styles.focused : m.styles.base
  const prompt = style.render(m.prompt)

  let displayValue = m.value
  if (m.echoMode === "password") {
    displayValue = m.echoCharacter.repeat(m.value.length)
  } else if (m.echoMode === "none") {
    displayValue = ""
  }

  if (displayValue.length === 0 && !m.focused) {
    const placeholder = m.styles.placeholder.render(m.placeholder)
    return prompt + placeholder
  }

  const before = displayValue.slice(0, m.cursor)
  const char = displayValue[m.cursor] || " "
  const after = displayValue.slice(m.cursor + 1)

  const cursorView = CursorView({ ...m.virtualCursor, char })
  const value = style.render(before) + cursorView + style.render(after)

  const err = m.err ? Style().foreground("red").render(` ${m.err}`) : ""

  return prompt + value + err
}
