import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { Height as StrHeight, JoinHorizontal, JoinVertical, Truncate } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap, type Help as BindingHelp } from "./key"
import {
  type HelpModel,
  Help as HelpComponent,
  SetBindings,
  View as HelpViewFn,
} from "./help"
import {
  type ViewportModel,
  Viewport,
  SetContent,
  View as ViewportView,
  Height as VpHeight,
  SetHeight as VpSetHeight,
  Width as VpWidth,
  SetWidth as VpSetWidth,
} from "./viewport"

export type Row = string[]

export interface Column {
  Title: string
  Width: number
}

export type StyleFunc = (row: number, col: number) => Style

export interface TableKeyMap {
  LineUp: Binding
  LineDown: Binding
  PageUp: Binding
  PageDown: Binding
  HalfPageUp: Binding
  HalfPageDown: Binding
  GotoTop: Binding
  GotoBottom: Binding
  ShortHelp(): Binding[]
  FullHelp(): Binding[][]
}

export function DefaultKeyMap(): TableKeyMap {
  return {
    LineUp: NewBinding({ keys: ["up", "k"], help: "up" }),
    LineDown: NewBinding({ keys: ["down", "j"], help: "down" }),
    PageUp: NewBinding({ keys: ["b", "pgup"], help: "page up" }),
    PageDown: NewBinding({ keys: ["f", "pgdown", " "], help: "page down" }),
    HalfPageUp: NewBinding({ keys: ["u", "ctrl+u"], help: "½ page up" }),
    HalfPageDown: NewBinding({ keys: ["d", "ctrl+d"], help: "½ page down" }),
    GotoTop: NewBinding({ keys: ["home", "g"], help: "go to start" }),
    GotoBottom: NewBinding({ keys: ["end", "G"], help: "go to end" }),
    ShortHelp() {
      return [this.LineUp, this.LineDown]
    },
    FullHelp() {
      return [
        [this.LineUp, this.LineDown, this.GotoTop, this.GotoBottom],
        [this.PageUp, this.PageDown, this.HalfPageUp, this.HalfPageDown],
      ]
    },
  }
}

export interface TableStyles {
  Header: Style
  Cell: Style
  Selected: Style
}

export function DefaultStyles(): TableStyles {
  return {
    Selected: new Style().bold(true).foreground("#ff69b4"),
    Header: new Style().bold(true).padding(0, 1),
    Cell: new Style().padding(0, 1),
  }
}

export interface TableModel {
  KeyMap: TableKeyMap
  Help: HelpModel
  cols: Column[]
  rows: Row[]
  cursor: number
  focused: boolean
  styles: TableStyles
  viewport: ViewportModel
  start: number
  end: number
  styleFunc: StyleFunc | null
}

export type Option = (m: TableModel) => void

export function New(...opts: Option[]): TableModel {
  const m: TableModel = {
    cursor: 0,
    focused: false,
    viewport: Viewport(0, 20),
    KeyMap: DefaultKeyMap(),
    Help: HelpComponent(),
    styles: DefaultStyles(),
    cols: [],
    rows: [],
    start: 0,
    end: 0,
    styleFunc: null,
  }

  for (const opt of opts) {
    opt(m)
  }

  UpdateViewport(m)
  return m
}

export function WithColumns(cols: Column[]): Option {
  return (m) => {
    m.cols = cols
  }
}

export function WithRows(rows: Row[]): Option {
  return (m) => {
    m.rows = rows
  }
}

export function WithHeight(h: number): Option {
  return (m) => {
    m.viewport = VpSetHeight(m.viewport, h - StrHeight(headersView(m)))
  }
}

export function WithWidth(w: number): Option {
  return (m) => {
    m.viewport = VpSetWidth(m.viewport, w)
  }
}

export function WithFocused(f: boolean): Option {
  return (m) => {
    m.focused = f
  }
}

export function WithStyles(s: TableStyles): Option {
  return (m) => {
    m.styles = s
  }
}

export function WithKeyMap(km: TableKeyMap): Option {
  return (m) => {
    m.KeyMap = km
  }
}

export function WithStyleFunc(fn: StyleFunc): Option {
  return (m) => {
    m.styleFunc = fn
  }
}

export function SetStyleFunc(m: TableModel, fn: StyleFunc | null): void {
  m.styleFunc = fn
  UpdateViewport(m)
}

export function Update(m: TableModel, msg: Msg): [TableModel, Cmd] {
  if (!m.focused) return [m, null]

  if (!msg || !("type" in msg)) return [m, null]
  if (msg.type !== "key") return [m, null]

  const key = msg as any

  if (Matches(m.KeyMap.LineUp, key)) {
    MoveUp(m, 1)
  } else if (Matches(m.KeyMap.LineDown, key)) {
    MoveDown(m, 1)
  } else if (Matches(m.KeyMap.PageUp, key)) {
    MoveUp(m, VpHeight(m.viewport))
  } else if (Matches(m.KeyMap.PageDown, key)) {
    MoveDown(m, VpHeight(m.viewport))
  } else if (Matches(m.KeyMap.HalfPageUp, key)) {
    MoveUp(m, Math.floor(VpHeight(m.viewport) / 2))
  } else if (Matches(m.KeyMap.HalfPageDown, key)) {
    MoveDown(m, Math.floor(VpHeight(m.viewport) / 2))
  } else if (Matches(m.KeyMap.GotoTop, key)) {
    GotoTop(m)
  } else if (Matches(m.KeyMap.GotoBottom, key)) {
    GotoBottom(m)
  }

  return [m, null]
}

export function Focused(m: TableModel): boolean {
  return m.focused
}

export function Focus(m: TableModel): void {
  m.focused = true
  UpdateViewport(m)
}

export function Blur(m: TableModel): void {
  m.focused = false
  UpdateViewport(m)
}

export function View(m: TableModel): string {
  return headersView(m) + "\n" + ViewportView(m.viewport)
}

export function HelpView(m: TableModel): string {
  const bindings = m.KeyMap.ShortHelp()
  const fullBindings = m.KeyMap.FullHelp()
  const h = SetBindings(m.Help, [bindings, ...fullBindings.slice(1)])
  m.Help = h
  return HelpViewFn(m.Help)
}

export function UpdateViewport(m: TableModel): void {
  const renderedRows: string[] = []

  const vpH = VpHeight(m.viewport)

  if (m.cursor >= 0) {
    m.start = clamp(m.cursor - vpH, 0, m.cursor)
  } else {
    m.start = 0
  }
  m.end = clamp(m.cursor + vpH, m.cursor, m.rows.length)

  for (let i = m.start; i < m.end; i++) {
    renderedRows.push(renderRow(m, i))
  }

  m.viewport = SetContent(m.viewport, JoinVertical(0, ...renderedRows))
}

export function SelectedRow(m: TableModel): Row | null {
  if (m.cursor < 0 || m.cursor >= m.rows.length) {
    return null
  }
  return m.rows[m.cursor]
}

export function Rows(m: TableModel): Row[] {
  return m.rows
}

export function Columns(m: TableModel): Column[] {
  return m.cols
}

export function SetRows(m: TableModel, rows: Row[]): void {
  m.rows = rows
  if (m.cursor > m.rows.length - 1) {
    m.cursor = m.rows.length - 1
  }
  UpdateViewport(m)
}

export function SetColumns(m: TableModel, cols: Column[]): void {
  m.cols = cols
  UpdateViewport(m)
}

export function SetWidth(m: TableModel, w: number): void {
  m.viewport = VpSetWidth(m.viewport, w)
  UpdateViewport(m)
}

export function SetHeight(m: TableModel, h: number): void {
  m.viewport = VpSetHeight(m.viewport, h - StrHeight(headersView(m)))
  UpdateViewport(m)
}

export function Height(m: TableModel): number {
  return VpHeight(m.viewport)
}

export function Width(m: TableModel): number {
  return VpWidth(m.viewport)
}

export function Cursor(m: TableModel): number {
  return m.cursor
}

export function SetCursor(m: TableModel, n: number): void {
  m.cursor = clamp(n, 0, m.rows.length - 1)
  UpdateViewport(m)
}

export function MoveUp(m: TableModel, n: number): void {
  m.cursor = clamp(m.cursor - n, 0, m.rows.length - 1)

  let offset = m.viewport.yOffset
  const vpH = VpHeight(m.viewport)

  if (m.start === 0) {
    offset = clamp(offset, 0, m.cursor)
  } else if (m.start < vpH) {
    offset = clamp(clamp(offset + n, 0, m.cursor), 0, vpH)
  } else if (offset >= 1) {
    offset = clamp(offset + n, 1, vpH)
  }

  m.viewport = { ...m.viewport, yOffset: offset }
  UpdateViewport(m)
}

export function MoveDown(m: TableModel, n: number): void {
  m.cursor = clamp(m.cursor + n, 0, m.rows.length - 1)
  UpdateViewport(m)

  let offset = m.viewport.yOffset
  const vpH = VpHeight(m.viewport)

  if (m.end === m.rows.length && offset > 0) {
    offset = clamp(offset - n, 1, vpH)
  } else if (m.cursor > (m.end - m.start) / 2 && offset > 0) {
    offset = clamp(offset - n, 1, m.cursor)
  } else if (offset > 1) {
  } else if (m.cursor > offset + vpH - 1) {
    offset = clamp(offset + 1, 0, 1)
  }

  m.viewport = { ...m.viewport, yOffset: offset }
}

export function GotoTop(m: TableModel): void {
  MoveUp(m, m.cursor)
}

export function GotoBottom(m: TableModel): void {
  MoveDown(m, m.rows.length)
}

export function FromValues(m: TableModel, value: string, separator: string): void {
  const rows: Row[] = []
  for (const line of value.split("\n")) {
    const r: string[] = []
    for (const field of line.split(separator)) {
      r.push(field)
    }
    rows.push(r)
  }
  SetRows(m, rows)
}

function headersView(m: TableModel): string {
  const cells: string[] = []
  for (const col of m.cols) {
    if (col.Width <= 0) continue
    const s = new Style().width(col.Width).maxWidth(col.Width).inline(true)
    const renderedCell = s.render(Truncate(col.Title, col.Width, "\u2026"))
    cells.push(m.styles.Header.render(renderedCell))
  }
  return JoinHorizontal(0, ...cells)
}

function renderRow(m: TableModel, r: number): string {
  const cells: string[] = []
  for (let i = 0; i < m.cols.length; i++) {
    const col = m.cols[i]
    if (col.Width <= 0) continue
    const value = m.rows[r]?.[i] ?? ""
    const s = new Style().width(col.Width).maxWidth(col.Width).inline(true)
    const cellStyle = m.styleFunc ? m.styleFunc(r, i) : m.styles.Cell
    const renderedCell = cellStyle.render(s.render(Truncate(value, col.Width, "\u2026")))
    cells.push(renderedCell)
  }

  const row = JoinHorizontal(0, ...cells)

  if (r === m.cursor) {
    return m.styles.Selected.render(row)
  }

  return row
}

function clamp(v: number, low: number, high: number): number {
  return Math.min(Math.max(v, low), high)
}
