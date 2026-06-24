// filepicker.ts | file picker component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

/**
 * FilePickerKeyMap is the key bindings for the file picker.
 */
export interface FilePickerKeyMap {
  GoToStart: Binding
  GoToEnd: Binding
  PageUp: Binding
  PageDown: Binding
  Select: Binding
  Close: Binding
  Back: Binding
}

/**
 * DefaultFilePickerKeyMap returns the default key bindings.
 */
export function DefaultFilePickerKeyMap(): FilePickerKeyMap {
  return {
    GoToStart: NewBinding({ keys: ["home", "g"], help: "go to start" }),
    GoToEnd: NewBinding({ keys: ["end", "G"], help: "go to end" }),
    PageUp: NewBinding({ keys: ["pgup", "ctrl+b"], help: "page up" }),
    PageDown: NewBinding({ keys: ["pgdown", "ctrl+f"], help: "page down" }),
    Select: NewBinding({ keys: ["enter"], help: "select" }),
    Close: NewBinding({ keys: ["esc", "q"], help: "close" }),
    Back: NewBinding({ keys: ["backspace", "-"], help: "go back" }),
  }
}

/**
 * FilePickerModel is the state for the file picker.
 */
export interface FilePickerModel {
  currentDirectory: string
  files: string[]
  cursor: number
  offset: number
  height: number
  width: number
  allowedTypes: string[]
  selected: string | null
  keyMap: FilePickerKeyMap
  hidden: boolean
}

/**
 * FilePicker creates a new file picker model.
 */
export function FilePicker(config: {
  directory?: string
  width?: number
  height?: number
  allowedTypes?: string[]
} = {}): FilePickerModel {
  return {
    currentDirectory: config.directory || process.cwd(),
    files: [],
    cursor: 0,
    offset: 0,
    height: config.height || 10,
    width: config.width || 40,
    allowedTypes: config.allowedTypes || [],
    selected: null,
    keyMap: DefaultFilePickerKeyMap(),
    hidden: false,
  }
}

/**
 * Update handles keyboard input.
 */
export function Update(m: FilePickerModel, msg: Msg): [FilePickerModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]
  if (msg.type !== "key") return [m, null]

  const key = msg as any

  if (Matches(m.keyMap.GoToStart as any, key)) {
    return [{ ...m, cursor: 0 }, null]
  }
  if (Matches(m.keyMap.GoToEnd as any, key)) {
    return [{ ...m, cursor: m.files.length - 1 }, null]
  }
  if (Matches(m.keyMap.PageUp as any, key)) {
    return [{ ...m, cursor: Math.max(0, m.cursor - m.height) }, null]
  }
  if (Matches(m.keyMap.PageDown as any, key)) {
    return [{ ...m, cursor: Math.min(m.files.length - 1, m.cursor + m.height) }, null]
  }
  if (Matches(m.keyMap.Select as any, key)) {
    const file = m.files[m.cursor]
    if (file) {
      return [{ ...m, selected: `${m.currentDirectory}/${file}` }, null]
    }
    return [m, null]
  }
  if (Matches(m.keyMap.Close as any, key)) {
    return [m, () => ({ type: "quit" } as any)]
  }
  if (Matches(m.keyMap.Back as any, key)) {
    // Go up one directory
    const parts = m.currentDirectory.split("/")
    parts.pop()
    const parent = parts.join("/") || "/"
    return [{ ...m, currentDirectory: parent, cursor: 0 }, null]
  }

  // Navigation
  if (key.name === "up") {
    return [{ ...m, cursor: Math.max(0, m.cursor - 1) }, null]
  }
  if (key.name === "down") {
    return [{ ...m, cursor: Math.min(m.files.length - 1, m.cursor + 1) }, null]
  }

  return [m, null]
}

/**
 * View renders the file picker.
 */
export function View(m: FilePickerModel): string {
  const lines: string[] = []

  // Header
  lines.push(Style().bold(true).foreground("#7f00ff").render(m.currentDirectory))
  lines.push("")

  // Files
  for (let i = 0; i < m.files.length; i++) {
    const file = m.files[i]!
    const isSelected = i === m.cursor
    const prefix = isSelected ? "▸ " : "  "
    const name = isSelected
      ? Style().bold(true).foreground("#7f00ff").render(file)
      : Style().render(file)

    lines.push(prefix + name)
  }

  // Help
  lines.push("")
  lines.push(Style().dim(true).render("enter: select · esc: close · backspace: go back"))

  return lines.join("\n")
}
