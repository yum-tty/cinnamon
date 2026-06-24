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
  PageUp: Binding
  PageDown: Binding
  InputBegin: Binding
  InputEnd: Binding
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
    PageUp: NewBinding({ keys: ["pgup", "ctrl+u"], help: "page up" }),
    PageDown: NewBinding({ keys: ["pgdown", "ctrl+d"], help: "page down" }),
    InputBegin: NewBinding({ keys: ["alt+<", "ctrl+home"], help: "go to beginning" }),
    InputEnd: NewBinding({ keys: ["alt+>", "ctrl+end"], help: "go to end" }),
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
 * CursorDown moves the cursor down one line.
 */
export function CursorDown(m: TextareaModel): TextareaModel {
  const lines = m.value.split("\n")
  let currentLine = 0
  let pos = 0
  for (let i = 0; i < lines.length; i++) {
    if (pos + lines[i]!.length >= m.cursor) {
      currentLine = i
      break
    }
    pos += lines[i]!.length + 1
  }
  if (currentLine < lines.length - 1) {
    const lineStart = pos
    const lineEnd = lineStart + lines[currentLine]!.length
    const colInLine = m.cursor - lineStart
    const nextLineStart = lineEnd + 1
    const nextLineLen = lines[currentLine + 1]!.length
    const newCol = Math.min(colInLine, nextLineLen)
    return { ...m, cursor: nextLineStart + newCol }
  }
  return m
}

/**
 * CursorUp moves the cursor up one line.
 */
export function CursorUp(m: TextareaModel): TextareaModel {
  const lines = m.value.split("\n")
  let currentLine = 0
  let pos = 0
  for (let i = 0; i < lines.length; i++) {
    if (pos + lines[i]!.length >= m.cursor) {
      currentLine = i
      break
    }
    pos += lines[i]!.length + 1
  }
  if (currentLine > 0) {
    let prevLineStart = 0
    for (let i = 0; i < currentLine - 1; i++) {
      prevLineStart += lines[i]!.length + 1
    }
    const colInLine = m.cursor - pos
    const prevLineLen = lines[currentLine - 1]!.length
    const newCol = Math.min(colInLine, prevLineLen)
    return { ...m, cursor: prevLineStart + newCol }
  }
  return m
}

/**
 * CursorStart moves the cursor to the start of the current line.
 */
export function CursorStart(m: TextareaModel): TextareaModel {
  const before = m.value.slice(0, m.cursor)
  const lastNewline = before.lastIndexOf("\n")
  return { ...m, cursor: lastNewline + 1 }
}

/**
 * CursorEnd moves the cursor to the end of the current line.
 */
export function CursorEnd(m: TextareaModel): TextareaModel {
  const after = m.value.slice(m.cursor)
  const nextNewline = after.indexOf("\n")
  const newCursor = nextNewline === -1 ? m.value.length : m.cursor + nextNewline
  return { ...m, cursor: newCursor }
}

/**
 * Line returns the current line number (0-indexed).
 */
export function Line(m: TextareaModel): number {
  const before = m.value.slice(0, m.cursor)
  return before.split("\n").length - 1
}

/**
 * LineCount returns the total number of lines.
 */
export function LineCount(m: TextareaModel): number {
  return m.value.split("\n").length
}

/**
 * Column returns the current column number (0-indexed).
 */
export function Column(m: TextareaModel): number {
  const before = m.value.slice(0, m.cursor)
  const lastNewline = before.lastIndexOf("\n")
  return m.cursor - lastNewline - 1
}

/**
 * Word returns the word at the cursor.
 */
export function Word(m: TextareaModel): string {
  const before = m.value.slice(0, m.cursor)
  const after = m.value.slice(m.cursor)
  const wordStart = before.search(/\S+$/)
  const wordEnd = after.search(/^\S+/)
  if (wordStart === -1 && wordEnd === -1) return ""
  const start = wordStart === -1 ? m.cursor : wordStart
  const end = wordEnd === -1 ? m.cursor : m.cursor + wordEnd
  return m.value.slice(start, end)
}

/**
 * Reset resets the textarea.
 */
export function Reset(m: TextareaModel): TextareaModel {
  return { ...m, value: "", cursor: 0 }
}

/**
 * Width returns the textarea width.
 */
export function Width(m: TextareaModel): number {
  return m.width
}

/**
 * SetWidth sets the textarea width.
 */
export function SetWidth(m: TextareaModel, width: number): TextareaModel {
  return { ...m, width }
}

/**
 * Height returns the textarea height.
 */
export function Height(m: TextareaModel): number {
  return m.height
}

/**
 * SetHeight sets the textarea height.
 */
export function SetHeight(m: TextareaModel, height: number): TextareaModel {
  return { ...m, height }
}

/**
 * SetPromptFunc sets a dynamic prompt function.
 */
export function SetPromptFunc(
  m: TextareaModel,
  _promptWidth: number,
  _fn: (info: { lineNumber: number; focused: boolean }) => string,
): TextareaModel {
  return m
}

/**
 * VirtualCursor returns whether virtual cursor is enabled.
 */
export function VirtualCursor(m: TextareaModel): boolean {
  return true
}

/**
 * SetVirtualCursor enables or disables virtual cursor.
 */
export function SetVirtualCursor(m: TextareaModel, _v: boolean): TextareaModel {
  return m
}

/**
 * Styles returns the textarea styles.
 */
export function Styles(m: TextareaModel): any {
  return null
}

/**
 * SetStyles sets the textarea styles.
 */
export function SetStyles(m: TextareaModel, _styles: any): TextareaModel {
  return m
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
  // Page up
  else if (Matches(m.keyMap.PageUp as any, key)) {
    const lines = m.value.split("\n")
    let currentLine = 0
    let pos = 0
    for (let i = 0; i < lines.length; i++) {
      if (pos + lines[i]!.length >= m.cursor) {
        currentLine = i
        break
      }
      pos += lines[i]!.length + 1
    }
    const targetLine = Math.max(0, currentLine - m.height)
    let newPos = 0
    for (let i = 0; i < targetLine; i++) {
      newPos += lines[i]!.length + 1
    }
    const colInLine = m.cursor - pos
    newCursor = newPos + Math.min(colInLine, lines[targetLine]!.length)
  }
  // Page down
  else if (Matches(m.keyMap.PageDown as any, key)) {
    const lines = m.value.split("\n")
    let currentLine = 0
    let pos = 0
    for (let i = 0; i < lines.length; i++) {
      if (pos + lines[i]!.length >= m.cursor) {
        currentLine = i
        break
      }
      pos += lines[i]!.length + 1
    }
    const targetLine = Math.min(lines.length - 1, currentLine + m.height)
    let newPos = 0
    for (let i = 0; i < targetLine; i++) {
      newPos += lines[i]!.length + 1
    }
    const colInLine = m.cursor - pos
    newCursor = newPos + Math.min(colInLine, lines[targetLine]!.length)
  }
  // Input begin
  else if (Matches(m.keyMap.InputBegin as any, key)) {
    newCursor = 0
  }
  // Input end
  else if (Matches(m.keyMap.InputEnd as any, key)) {
    newCursor = m.value.length
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
