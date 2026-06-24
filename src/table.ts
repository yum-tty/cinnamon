// table.ts | table component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

/**
 * TableKeyMap is the key bindings for the table.
 */
export interface TableKeyMap {
  LineUp: Binding
  LineDown: Binding
  PageUp: Binding
  PageDown: Binding
  HalfPageUp: Binding
  HalfPageDown: Binding
  LineStart: Binding
  LineEnd: Binding
}

/**
 * DefaultTableKeyMap returns the default key bindings.
 */
export function DefaultTableKeyMap(): TableKeyMap {
  return {
    LineUp: NewBinding({ keys: ["up", "k"], help: "up" }),
    LineDown: NewBinding({ keys: ["down", "j"], help: "down" }),
    PageUp: NewBinding({ keys: ["pgup", "ctrl+b"], help: "page up" }),
    PageDown: NewBinding({ keys: ["pgdown", "ctrl+f"], help: "page down" }),
    HalfPageUp: NewBinding({ keys: ["ctrl+u"], help: "half page up" }),
    HalfPageDown: NewBinding({ keys: ["ctrl+d"], help: "half page down" }),
    LineStart: NewBinding({ keys: ["home", "g"], help: "go to start" }),
    LineEnd: NewBinding({ keys: ["end", "G"], help: "go to end" }),
  }
}

/**
 * Column is a table column definition.
 */
export interface Column {
  title: string
  width: number
  alignment?: "left" | "center" | "right"
}

/**
 * TableModel is the state for the table.
 */
export interface TableModel {
  columns: Column[]
  rows: string[][]
  widths: number[]
  height: number
  cursor: number
  offset: number
  keyMap: TableKeyMap
}

/**
 * Table creates a new table model.
 */
export function Table(columns: Column[], rows: string[][], height: number): TableModel {
  return {
    columns,
    rows,
    widths: columns.map((c) => c.width),
    height,
    cursor: 0,
    offset: 0,
    keyMap: DefaultTableKeyMap(),
  }
}

/**
 * SetRows sets the table rows.
 */
export function SetRows(m: TableModel, rows: string[][]): TableModel {
  return { ...m, rows, cursor: 0, offset: 0 }
}

/**
 * Update handles keyboard input.
 */
export function Update(m: TableModel, msg: Msg): [TableModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]
  if (msg.type !== "key") return [m, null]

  const key = msg as any

  if (Matches(m.keyMap.LineUp as any, key)) {
    return [{ ...m, cursor: Math.max(0, m.cursor - 1) }, null]
  }
  if (Matches(m.keyMap.LineDown as any, key)) {
    return [{ ...m, cursor: Math.min(m.rows.length - 1, m.cursor + 1) }, null]
  }
  if (Matches(m.keyMap.PageUp as any, key)) {
    return [{ ...m, cursor: Math.max(0, m.cursor - m.height) }, null]
  }
  if (Matches(m.keyMap.PageDown as any, key)) {
    return [{ ...m, cursor: Math.min(m.rows.length - 1, m.cursor + m.height) }, null]
  }
  if (Matches(m.keyMap.LineStart as any, key)) {
    return [{ ...m, cursor: 0 }, null]
  }
  if (Matches(m.keyMap.LineEnd as any, key)) {
    return [{ ...m, cursor: m.rows.length - 1 }, null]
  }

  return [m, null]
}

/**
 * View renders the table.
 */
export function View(m: TableModel): string {
  const lines: string[] = []

  // Header
  const header = m.columns
    .map((col) => {
      const title = col.title.padEnd(col.width)
      return Style().bold(true).render(title)
    })
    .join(" │ ")

  lines.push(header)
  lines.push(Style().dim(true).render("─".repeat(m.columns.reduce((a, c) => a + c.width + 3, -3))))

  // Rows
  for (let i = 0; i < Math.min(m.rows.length, m.height); i++) {
    const row = m.rows[i]!
    const isSelected = i === m.cursor

    const cells = row.map((cell, j) => {
      const col = m.columns[j]
      const width = col?.width ?? 10
      const padded = cell.padEnd(width)
      return isSelected ? Style().bold(true).render(padded) : padded
    })

    lines.push(cells.join(" │ "))
  }

  return lines.join("\n")
}
