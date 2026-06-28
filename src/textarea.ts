import type { Model, Msg, Cmd } from "cinnamon-bun"
import { NewStyle, type Style as StyleType } from "caramel"
import {
  Cursor,
  type CursorModel,
  Focus as CursorFocus,
  Blur as CursorBlur,
  SetChar,
  Update as CursorUpdate,
  View as CursorView,
  SetMode,
} from "./cursor"
import { type Binding, NewBinding, Matches } from "./key"
import {
  Viewport,
  type ViewportModel,
  SetContent as ViewportSetContent,
  GotoTop,
  ScrollUp,
  ScrollDown,
  Height as ViewportHeight,
  SetHeight as ViewportSetHeight,
  Width as ViewportWidth,
  SetWidth as ViewportSetWidth,
  ScrollPercent as ViewportScrollPercent,
  Update as ViewportUpdate,
  View as ViewportView,
} from "./viewport"
import { ReadClipboard } from "cinnamon-bun"

function getStringWidth(str: string): number {
  let width = 0
  for (const char of str) {
    const code = char.codePointAt(0)!
    if ((code >= 0x1100 && code <= 0x115f) || (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe10 && code <= 0xfe6f) || (code >= 0xff01 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6) || (code >= 0x20000 && code <= 0x2fffd) || (code >= 0x30000 && code <= 0x3fffd)) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

const DEFAULT_HEIGHT = 6
const DEFAULT_WIDTH = 40
const DEFAULT_CHAR_LIMIT = 0
const DEFAULT_MAX_HEIGHT = 99
const DEFAULT_MAX_WIDTH = 500
const MAX_LINES = 10000
const MIN_HEIGHT = 1

export interface PasteMsg {
  type: "paste"
  content: string
}

export interface PasteErrMsg {
  type: "pasteErrMsg"
  error: string
}

export interface TextareaKeyMap {
  CharacterBackward: Binding
  CharacterForward: Binding
  DeleteAfterCursor: Binding
  DeleteBeforeCursor: Binding
  DeleteCharacterBackward: Binding
  DeleteCharacterForward: Binding
  DeleteWordBackward: Binding
  DeleteWordForward: Binding
  InsertNewline: Binding
  LineEnd: Binding
  LineNext: Binding
  LinePrevious: Binding
  LineStart: Binding
  PageUp: Binding
  PageDown: Binding
  Paste: Binding
  WordBackward: Binding
  WordForward: Binding
  InputBegin: Binding
  InputEnd: Binding
  UppercaseWordForward: Binding
  LowercaseWordForward: Binding
  CapitalizeWordForward: Binding
  TransposeCharacterBackward: Binding
}

export function DefaultTextareaKeyMap(): TextareaKeyMap {
  return {
    CharacterForward: NewBinding({ keys: ["right", "ctrl+f"], help: "character forward" }),
    CharacterBackward: NewBinding({ keys: ["left", "ctrl+b"], help: "character backward" }),
    WordForward: NewBinding({ keys: ["alt+right", "alt+f"], help: "word forward" }),
    WordBackward: NewBinding({ keys: ["alt+left", "alt+b"], help: "word backward" }),
    LineNext: NewBinding({ keys: ["down", "ctrl+n"], help: "next line" }),
    LinePrevious: NewBinding({ keys: ["up", "ctrl+p"], help: "previous line" }),
    DeleteWordBackward: NewBinding({ keys: ["alt+backspace", "ctrl+w"], help: "delete word backward" }),
    DeleteWordForward: NewBinding({ keys: ["alt+delete", "alt+d"], help: "delete word forward" }),
    DeleteAfterCursor: NewBinding({ keys: ["ctrl+k"], help: "delete after cursor" }),
    DeleteBeforeCursor: NewBinding({ keys: ["ctrl+u"], help: "delete before cursor" }),
    InsertNewline: NewBinding({ keys: ["enter", "ctrl+m"], help: "insert newline" }),
    DeleteCharacterBackward: NewBinding({ keys: ["backspace", "ctrl+h"], help: "delete character backward" }),
    DeleteCharacterForward: NewBinding({ keys: ["delete", "ctrl+d"], help: "delete character forward" }),
    LineStart: NewBinding({ keys: ["home", "ctrl+a"], help: "line start" }),
    LineEnd: NewBinding({ keys: ["end", "ctrl+e"], help: "line end" }),
    PageUp: NewBinding({ keys: ["pgup"], help: "page up" }),
    PageDown: NewBinding({ keys: ["pgdown"], help: "page down" }),
    Paste: NewBinding({ keys: ["ctrl+v"], help: "paste" }),
    InputBegin: NewBinding({ keys: ["alt+<", "ctrl+home"], help: "input begin" }),
    InputEnd: NewBinding({ keys: ["alt+>", "ctrl+end"], help: "input end" }),
    CapitalizeWordForward: NewBinding({ keys: ["alt+c"], help: "capitalize word forward" }),
    LowercaseWordForward: NewBinding({ keys: ["alt+l"], help: "lowercase word forward" }),
    UppercaseWordForward: NewBinding({ keys: ["alt+u"], help: "uppercase word forward" }),
    TransposeCharacterBackward: NewBinding({ keys: ["ctrl+t"], help: "transpose character backward" }),
  }
}

export interface LineInfo {
  width: number
  charWidth: number
  height: number
  startColumn: number
  columnOffset: number
  rowOffset: number
  charOffset: number
}

export interface PromptInfo {
  lineNumber: number
  focused: boolean
}

export interface CursorStyle {
  color: string
  shape: string
  blink: boolean
  blinkSpeed: number
}

export interface StyleState {
  base: StyleType
  text: StyleType
  lineNumber: StyleType
  cursorLineNumber: StyleType
  cursorLine: StyleType
  endOfBuffer: StyleType
  placeholder: StyleType
  prompt: StyleType
}

export interface TextareaStyles {
  focused: StyleState
  blurred: StyleState
  cursor: CursorStyle
}

function computedCursorLine(state: StyleState): StyleType {
  return state.cursorLine.inherit(state.base).inline(true)
}

function computedCursorLineNumber(state: StyleState): StyleType {
  return state.cursorLineNumber.inherit(state.cursorLine).inherit(state.base).inline(true)
}

function computedEndOfBuffer(state: StyleState): StyleType {
  return state.endOfBuffer.inherit(state.base).inline(true)
}

function computedLineNumber(state: StyleState): StyleType {
  return state.lineNumber.inherit(state.base).inline(true)
}

function computedPlaceholder(state: StyleState): StyleType {
  return state.placeholder.inherit(state.base).inline(true)
}

function computedPrompt(state: StyleState): StyleType {
  return state.prompt.inherit(state.base).inline(true)
}

function computedText(state: StyleState): StyleType {
  return state.text.inherit(state.base).inline(true)
}

export function DefaultStyles(isDark: boolean): TextareaStyles {
  const light = (lightVal: string, darkVal: string) => isDark ? darkVal : lightVal

  const focused: StyleState = {
    base: NewStyle(),
    cursorLine: NewStyle().background(light("#ffffff", "#000000")),
    cursorLineNumber: NewStyle().foreground(light("#f0f0f0", "#f0f0f0")),
    endOfBuffer: NewStyle().foreground(light("#fefefe", "#000000")),
    lineNumber: NewStyle().foreground(light("#f9f9f9", "#07")),
    placeholder: NewStyle().foreground("#f0f0f0"),
    prompt: NewStyle().foreground("#07"),
    text: NewStyle(),
  }

  const blurred: StyleState = {
    base: NewStyle(),
    cursorLine: NewStyle().foreground(light("#f5f5f5", "#07")),
    cursorLineNumber: NewStyle().foreground(light("#f9f9f9", "#07")),
    endOfBuffer: NewStyle().foreground(light("#fefefe", "#000000")),
    lineNumber: NewStyle().foreground(light("#f9f9f9", "#07")),
    placeholder: NewStyle().foreground("#f0f0f0"),
    prompt: NewStyle().foreground("#07"),
    text: NewStyle().foreground(light("#f5f5f5", "#07")),
  }

  return {
    focused,
    blurred,
    cursor: {
      color: "#07",
      shape: "block",
      blink: true,
      blinkSpeed: 530,
    },
  }
}

export function DefaultDarkStyles(): TextareaStyles {
  return DefaultStyles(true)
}

export function DefaultLightStyles(): TextareaStyles {
  return DefaultStyles(false)
}

export interface TextareaModel {
  err: string | null
  cache: Map<string, string[]>
  prompt: string
  placeholder: string
  showLineNumbers: boolean
  endOfBufferCharacter: string
  keyMap: TextareaKeyMap
  virtualCursor: CursorModel
  charLimit: number
  maxHeight: number
  maxWidth: number
  dynamicHeight: boolean
  softWrap: boolean
  minHeight: number
  maxContentHeight: number
  styles: TextareaStyles
  useVirtualCursor: boolean
  promptFunc: ((info: PromptInfo) => string) | null
  promptWidth: number
  width: number
  height: number
  value: string[]
  focus: boolean
  col: number
  row: number
  lastCharOffset: number
  viewport: ViewportModel
}

export function New(): TextareaModel {
  const vp = Viewport(DEFAULT_WIDTH, DEFAULT_HEIGHT)
  const cur = Cursor()
  const styles = DefaultDarkStyles()

  const m: TextareaModel = {
    err: null,
    cache: new Map(),
    prompt: "│ ",
    placeholder: "",
    showLineNumbers: true,
    endOfBufferCharacter: " ",
    keyMap: DefaultTextareaKeyMap(),
    useVirtualCursor: true,
    virtualCursor: cur,
    charLimit: DEFAULT_CHAR_LIMIT,
    maxHeight: DEFAULT_MAX_HEIGHT,
    maxWidth: DEFAULT_MAX_WIDTH,
    dynamicHeight: false,
    softWrap: true,
    minHeight: 0,
    maxContentHeight: 0,
    styles,
    promptFunc: null,
    promptWidth: 0,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    value: [""],
    focus: false,
    col: 0,
    row: 0,
    lastCharOffset: 0,
    viewport: vp,
  }

  m.promptWidth = getStringWidth(m.prompt)
  SetHeight(m, DEFAULT_HEIGHT)
  SetWidth(m, DEFAULT_WIDTH)

  return m
}

export function Styles(m: TextareaModel): TextareaStyles {
  return m.styles
}

export function SetStyles(m: TextareaModel, s: TextareaStyles): TextareaModel {
  m.styles = s
  updateVirtualCursorStyle(m)
  return m
}

export function VirtualCursor(m: TextareaModel): boolean {
  return m.useVirtualCursor
}

export function SetVirtualCursor(m: TextareaModel, v: boolean): TextareaModel {
  m.useVirtualCursor = v
  updateVirtualCursorStyle(m)
  return m
}

export function SoftWrap(m: TextareaModel): boolean {
  return m.softWrap
}

export function SetSoftWrap(m: TextareaModel, v: boolean): TextareaModel {
  m.softWrap = v
  m.cache = new Map()
  return m
}

function updateVirtualCursorStyle(m: TextareaModel): void {
  if (!m.useVirtualCursor) {
    SetMode(m.virtualCursor, "hide")
    return
  }
  const color = m.styles.cursor.color
  m.virtualCursor.style = NewStyle().foreground(color).reverse(true)

  if (m.styles.cursor.blink) {
    if (m.styles.cursor.blinkSpeed > 0) {
      m.virtualCursor.blinkSpeed = m.styles.cursor.blinkSpeed
    }
    SetMode(m.virtualCursor, "blink")
    return
  }
  SetMode(m.virtualCursor, "static")
}

export function SetValue(m: TextareaModel, s: string): TextareaModel {
  m = Reset(m)
  m = InsertString(m, s)
  m = recalculateHeight(m)
  return m
}

export function InsertString(m: TextareaModel, s: string): TextareaModel {
  m = insertRunesFromUserInput(m, [...s])
  m = recalculateHeight(m)
  return m
}

export function InsertRune(m: TextareaModel, r: string): TextareaModel {
  m = insertRunesFromUserInput(m, [r])
  m = recalculateHeight(m)
  return m
}

function insertRunesFromUserInput(m: TextareaModel, runes: string[]): TextareaModel {
  runes = runes.filter(r => r !== "\r" && r !== "\t" && r !== "\0")

  if (m.charLimit > 0) {
    const availSpace = m.charLimit - Length(m)
    if (availSpace <= 0) return m
    if (availSpace < runes.length) {
      runes = runes.slice(0, availSpace)
    }
  }

  const lines: string[] = [""]
  for (const r of runes) {
    if (r === "\n") {
      lines.push("")
    } else {
      lines[lines.length - 1] += r
    }
  }

  if (MAX_LINES > 0 && m.value.length + lines.length - 1 > MAX_LINES) {
    const allowedHeight = Math.max(0, MAX_LINES - m.value.length + 1)
    lines.splice(allowedHeight)
  }

  if (m.maxContentHeight > 0) {
    const budget = m.maxContentHeight - totalVisualLines(m)
    let estimated = visualLinesForInsert(m, lines)
    while (lines.length > 1 && estimated > budget) {
      lines.pop()
      estimated = visualLinesForInsert(m, lines)
    }
    if (estimated > budget) return m
  }

  if (lines.length === 0) return m

  const tail = m.value[m.row]!.slice(m.col)

  m.value[m.row] = m.value[m.row]!.slice(0, m.col) + lines[0]!
  m.col += lines[0]!.length

  if (lines.length - 1 > 0) {
    const numExtraLines = lines.length - 1
    const newGrid: string[] = []
    for (let i = 0; i <= m.row; i++) {
      newGrid.push(m.value[i]!)
    }
    for (let i = m.row + 1; i < m.value.length; i++) {
      newGrid.push(m.value[i]!)
    }

    const resultGrid: string[] = []
    for (let i = 0; i <= m.row; i++) {
      resultGrid.push(newGrid[i]!)
    }
    for (const l of lines.slice(1)) {
      resultGrid.push(l)
      m.row++
      m.col = l.length
    }
    for (let i = m.row - numExtraLines + 1; i < newGrid.length; i++) {
      if (i > 0 && i < newGrid.length) {
        resultGrid.push(newGrid[i]!)
      }
    }

    m.value = resultGrid
  }

  m.value[m.row] = m.value[m.row]!.slice(0, m.col) + tail
  m = SetCursorColumn(m, m.col)

  return m
}

function visualLinesForInsert(m: TextareaModel, lines: string[]): number {
  if (lines.length === 0) return 0

  const currentRowVisual = memoizedWrap(m, m.value[m.row]!, m.width).length

  let merged = m.value[m.row]!.slice(0, m.col) + lines[0]!
  if (lines.length === 1) {
    merged += m.value[m.row]!.slice(m.col)
  }
  let delta = memoizedWrap(m, merged, m.width).length - currentRowVisual

  for (let i = 0; i < lines.length; i++) {
    let content = lines[i]!
    if (i === lines.length - 1) {
      content += m.value[m.row]!.slice(m.col)
    }
    delta += memoizedWrap(m, content, m.width).length
  }

  return delta
}

export function Value(m: TextareaModel): string {
  if (m.value.length === 0) return ""
  return m.value.join("\n")
}

export function Length(m: TextareaModel): number {
  let l = 0
  for (const row of m.value) {
    l += getStringWidth(row)
  }
  return l + m.value.length - 1
}

export function LineCount(m: TextareaModel): number {
  return m.value.length
}

export function Line(m: TextareaModel): number {
  return m.row
}

export function Column(m: TextareaModel): number {
  return m.col
}

export function ScrollYOffset(m: TextareaModel): number {
  return m.viewport.yOffset
}

export function ScrollPercent(m: TextareaModel): number {
  return ViewportScrollPercent(m.viewport)
}

export function setCursorLineRelative(m: TextareaModel, delta: number): TextareaModel {
  if (delta === 0) return m

  const li = LineInfo_fn(m)
  let charOffset = Math.max(m.lastCharOffset, li.charOffset)
  m.lastCharOffset = charOffset

  const trailingSpace = 2

  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      if (li.rowOffset + 1 >= li.height && m.row < m.value.length - 1) {
        m.row++
        m.col = Math.min(m.col, m.value[m.row]!.length)
      } else if (m.value[m.row]!.length > 0) {
        m.col = Math.min(li.startColumn + li.width + trailingSpace, m.value[m.row]!.length - 1)
      }
    }
  } else {
    for (let i = 0; i < -delta; i++) {
      const curLi = LineInfo_fn(m)
      if (curLi.rowOffset <= 0 && m.row > 0) {
        m.row--
        m.col = Math.min(m.col, m.value[m.row]!.length)
      } else if (m.value[m.row]!.length > 0) {
        m.col = curLi.startColumn - trailingSpace
      }
    }
  }

  const nli = LineInfo_fn(m)
  m.col = nli.startColumn

  if (nli.width <= 0) {
    m = repositionView(m)
    return m
  }

  let offset = 0
  while (offset < charOffset) {
    if (m.row >= m.value.length || m.col >= m.value[m.row]!.length || offset >= nli.charWidth - 1) break
    offset += getStringWidth(m.value[m.row]!.charAt(m.col))
    m.col++
  }
  m = repositionView(m)
  return m
}

export function CursorDown(m: TextareaModel): TextareaModel {
  return setCursorLineRelative(m, 1)
}

export function CursorUp(m: TextareaModel): TextareaModel {
  return setCursorLineRelative(m, -1)
}

export function SetCursorColumn(m: TextareaModel, col: number): TextareaModel {
  m.col = clamp(col, 0, m.value[m.row]!.length)
  m.lastCharOffset = 0
  return m
}

export function CursorStart(m: TextareaModel): TextareaModel {
  return SetCursorColumn(m, 0)
}

export function CursorEnd(m: TextareaModel): TextareaModel {
  return SetCursorColumn(m, m.value[m.row]!.length)
}

export function Focused(m: TextareaModel): boolean {
  return m.focus
}

function activeStyle(m: TextareaModel): StyleState {
  if (m.focus) return m.styles.focused
  return m.styles.blurred
}

export function Focus(m: TextareaModel): [TextareaModel, Cmd] {
  m.focus = true
  const [vc, cmd] = CursorFocus(m.virtualCursor)
  m.virtualCursor = vc
  return [m, cmd]
}

export function Blur(m: TextareaModel): void {
  m.focus = false
  m.virtualCursor = CursorBlur(m.virtualCursor)
}

export function Blink(): Cmd {
  return () => Promise.resolve({ type: "initialBlink" } as any)
}

export function Paste(): Cmd {
  return ReadClipboard
}

export function Reset(m: TextareaModel): TextareaModel {
  m.value = [""]
  m.col = 0
  m.row = 0
  const [vpTop] = GotoTop(m.viewport)
  m.viewport = vpTop
  m = SetCursorColumn(m, 0)
  m = recalculateHeight(m)
  return m
}

export function Word(m: TextareaModel): string {
  const line = m.value[m.row]!
  const col = m.col - 1

  if (col < 0) return ""
  if (col >= line.length) return ""
  if (isSpace(line.charAt(col))) return ""

  let start = col
  while (start > 0 && !isSpace(line.charAt(start - 1))) {
    start--
  }

  let end = col
  while (end < line.length && !isSpace(line.charAt(end))) {
    end++
  }

  return line.slice(start, end)
}

function deleteBeforeCursor(m: TextareaModel): TextareaModel {
  m.value[m.row] = m.value[m.row]!.slice(m.col)
  m = SetCursorColumn(m, 0)
  return m
}

function deleteAfterCursor(m: TextareaModel): TextareaModel {
  m.value[m.row] = m.value[m.row]!.slice(0, m.col)
  m = SetCursorColumn(m, m.value[m.row]!.length)
  return m
}

function transposeLeft(m: TextareaModel): TextareaModel {
  if (m.col === 0 || m.value[m.row]!.length < 2) return m
  if (m.col >= m.value[m.row]!.length) {
    m = SetCursorColumn(m, m.col - 1)
  }
  const row = m.value[m.row]!
  const a = row.charAt(m.col - 1)
  const b = row.charAt(m.col)
  m.value[m.row] = row.slice(0, m.col - 1) + b + a + row.slice(m.col + 1)
  if (m.col < m.value[m.row]!.length) {
    m = SetCursorColumn(m, m.col + 1)
  }
  return m
}

function deleteWordLeft(m: TextareaModel): TextareaModel {
  if (m.col === 0 || m.value[m.row]!.length === 0) return m

  const oldCol = m.col
  m = SetCursorColumn(m, m.col - 1)

  while (m.col >= 0 && isSpace(m.value[m.row]!.charAt(m.col))) {
    if (m.col <= 0) break
    m = SetCursorColumn(m, m.col - 1)
  }

  while (m.col > 0) {
    if (!isSpace(m.value[m.row]!.charAt(m.col))) {
      m = SetCursorColumn(m, m.col - 1)
    } else {
      if (m.col > 0) {
        m = SetCursorColumn(m, m.col + 1)
      }
      break
    }
  }

  if (oldCol > m.value[m.row]!.length) {
    m.value[m.row] = m.value[m.row]!.slice(0, m.col)
  } else {
    m.value[m.row] = m.value[m.row]!.slice(0, m.col) + m.value[m.row]!.slice(oldCol)
  }

  return m
}

function deleteWordRight(m: TextareaModel): TextareaModel {
  if (m.col >= m.value[m.row]!.length || m.value[m.row]!.length === 0) return m

  const oldCol = m.col

  while (m.col < m.value[m.row]!.length && isSpace(m.value[m.row]!.charAt(m.col))) {
    m = SetCursorColumn(m, m.col + 1)
  }

  while (m.col < m.value[m.row]!.length) {
    if (!isSpace(m.value[m.row]!.charAt(m.col))) {
      m = SetCursorColumn(m, m.col + 1)
    } else {
      break
    }
  }

  if (m.col > m.value[m.row]!.length) {
    m.value[m.row] = m.value[m.row]!.slice(0, oldCol)
  } else {
    m.value[m.row] = m.value[m.row]!.slice(0, oldCol) + m.value[m.row]!.slice(m.col)
  }

  m = SetCursorColumn(m, oldCol)
  return m
}

function characterRight(m: TextareaModel): TextareaModel {
  if (m.col < m.value[m.row]!.length) {
    m = SetCursorColumn(m, m.col + 1)
  } else {
    if (m.row < m.value.length - 1) {
      m.row++
      m = CursorStart(m)
    }
  }
  return m
}

function characterLeft(m: TextareaModel, insideLine: boolean): TextareaModel {
  if (m.col === 0 && m.row !== 0) {
    m.row--
    m = CursorEnd(m)
    if (!insideLine) return m
  }
  if (m.col > 0) {
    m = SetCursorColumn(m, m.col - 1)
  }
  return m
}

function wordLeft(m: TextareaModel): TextareaModel {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const prevRow = m.row
    const prevCol = m.col
    m = characterLeft(m, true)
    if (m.row === prevRow && m.col === prevCol) break
    if (m.col < m.value[m.row]!.length && !isSpace(m.value[m.row]!.charAt(m.col))) break
  }

  while (m.col > 0) {
    if (isSpace(m.value[m.row]!.charAt(m.col - 1))) break
    m = SetCursorColumn(m, m.col - 1)
  }

  return m
}

function doWordRight(m: TextareaModel, fn: (charIdx: number, pos: number) => void): TextareaModel {
  while (m.col >= m.value[m.row]!.length || isSpace(m.value[m.row]!.charAt(m.col))) {
    if (m.row === m.value.length - 1 && m.col === m.value[m.row]!.length) break
    m = characterRight(m)
  }

  let charIdx = 0
  while (m.col < m.value[m.row]!.length) {
    if (isSpace(m.value[m.row]!.charAt(m.col))) break
    fn(charIdx, m.col)
    m = SetCursorColumn(m, m.col + 1)
    charIdx++
  }

  return m
}

function wordRight(m: TextareaModel): TextareaModel {
  return doWordRight(m, () => {})
}

function uppercaseRight(m: TextareaModel): TextareaModel {
  return doWordRight(m, (_charIdx, i) => {
    const row = m.value[m.row]!
    m.value[m.row] = row.slice(0, i) + row.charAt(i).toUpperCase() + row.slice(i + 1)
  })
}

function lowercaseRight(m: TextareaModel): TextareaModel {
  return doWordRight(m, (_charIdx, i) => {
    const row = m.value[m.row]!
    m.value[m.row] = row.slice(0, i) + row.charAt(i).toLowerCase() + row.slice(i + 1)
  })
}

function capitalizeRight(m: TextareaModel): TextareaModel {
  return doWordRight(m, (charIdx, i) => {
    if (charIdx === 0) {
      const row = m.value[m.row]!
      m.value[m.row] = row.slice(0, i) + row.charAt(i).toUpperCase() + row.slice(i + 1)
    }
  })
}

export function LineInfo_fn(m: TextareaModel): LineInfo {
  const grid = memoizedWrap(m, m.value[m.row]!, m.width)

  let counter = 0
  for (let i = 0; i < grid.length; i++) {
    const line = grid[i]!

    if (counter + line.length === m.col && i + 1 < grid.length) {
      return {
        charOffset: 0,
        columnOffset: 0,
        height: grid.length,
        rowOffset: i + 1,
        startColumn: m.col,
        width: grid[i + 1]!.length,
        charWidth: getStringWidth(line),
      }
    }

    if (counter + line.length >= m.col) {
      return {
        charOffset: getStringWidth(line.slice(0, Math.max(0, m.col - counter))),
        columnOffset: m.col - counter,
        height: grid.length,
        rowOffset: i,
        startColumn: counter,
        width: line.length,
        charWidth: getStringWidth(line),
      }
    }

    counter += line.length
  }

  return { width: 0, charWidth: 0, height: 0, startColumn: 0, columnOffset: 0, rowOffset: 0, charOffset: 0 }
}

function repositionView(m: TextareaModel): TextareaModel {
  const minimum = m.viewport.yOffset
  const maximum = minimum + ViewportHeight(m.viewport) - 1
  const row = cursorLineNumber(m)
  if (row < minimum) {
    m.viewport = ScrollUp(m.viewport, minimum - row)
  } else if (row > maximum) {
    m.viewport = ScrollDown(m.viewport, row - maximum)
  }
  return m
}

export function Width_fn(m: TextareaModel): number {
  return m.width
}

export function SetWidth(m: TextareaModel, w: number): TextareaModel {
  if (m.promptFunc === null) {
    m.promptWidth = getStringWidth(m.prompt)
  }

  const reservedOuter = activeStyle(m).base.getHorizontalFrameSize()
  let reservedInner = m.promptWidth

  if (m.showLineNumbers) {
    const gap = 2
    reservedInner += numDigits(m.maxHeight) + gap
  }

  const minWidth = reservedInner + reservedOuter + 1
  let inputWidth = Math.max(w, minWidth)

  if (m.maxWidth > 0) {
    inputWidth = Math.min(inputWidth, m.maxWidth)
  }

  m.viewport = ViewportSetWidth(m.viewport, inputWidth - reservedOuter)
  m.width = inputWidth - reservedOuter - reservedInner
  m = recalculateHeight(m)
  return m
}

export function SetPromptFunc(m: TextareaModel, promptWidth: number, fn: (info: PromptInfo) => string): TextareaModel {
  m.promptFunc = fn
  m.promptWidth = promptWidth
  return m
}

export function Height_fn(m: TextareaModel): number {
  return m.height
}

export function SetHeight(m: TextareaModel, h: number): TextareaModel {
  if (m.maxHeight > 0) {
    m.height = clamp(h, MIN_HEIGHT, m.maxHeight)
    m.viewport = ViewportSetHeight(m.viewport, clamp(h, MIN_HEIGHT, m.maxHeight))
  } else {
    m.height = Math.max(h, MIN_HEIGHT)
    m.viewport = ViewportSetHeight(m.viewport, Math.max(h, MIN_HEIGHT))
  }

  m = repositionView(m)
  return m
}

export function MoveToBegin(m: TextareaModel): TextareaModel {
  m.row = 0
  m = SetCursorColumn(m, 0)
  m = repositionView(m)
  return m
}

export function MoveToEnd(m: TextareaModel): TextareaModel {
  m.row = m.value.length - 1
  m = SetCursorColumn(m, m.value[m.row]!.length)
  m = repositionView(m)
  return m
}

export function PageUp_fn(m: TextareaModel): TextareaModel {
  const offset = m.viewport.yOffset - cursorLineNumber(m)
  if (offset < 0) {
    m = setCursorLineRelative(m, offset)
    return m
  }
  m = setCursorLineRelative(m, -m.height)
  return m
}

export function PageDown_fn(m: TextareaModel): TextareaModel {
  const offset = cursorLineNumber(m) - m.viewport.yOffset
  if (offset < m.height - 1) {
    m = setCursorLineRelative(m, m.height - 1 - offset)
    return m
  }
  m = setCursorLineRelative(m, m.height)
  return m
}

function memoizedWrap(m: TextareaModel, lineArr: string, width: number): string[] {
  if (!m.softWrap) {
    if (getStringWidth(lineArr) <= width) return [lineArr]
    let truncated = ""
    let w = 0
    for (const ch of lineArr) {
      const cw = getStringWidth(ch)
      if (w + cw > width) break
      truncated += ch
      w += cw
    }
    return [truncated]
  }

  const key = lineArr + "\0" + width.toString()
  const cached = m.cache.get(key)
  if (cached) return cached
  const v = wrapFn(lineArr, width)
  m.cache.set(key, v)
  return v
}

function cursorLineNumber(m: TextareaModel): number {
  let line = 0
  for (let i = 0; i < m.row; i++) {
    line += memoizedWrap(m, m.value[i]!, m.width).length
  }
  line += LineInfo_fn(m).rowOffset
  return line
}

function totalVisualLines(m: TextareaModel): number {
  let n = 0
  for (const line of m.value) {
    n += memoizedWrap(m, line, m.width).length
  }
  return n
}

function recalculateHeight(m: TextareaModel): TextareaModel {
  if (!m.dynamicHeight) return m
  const minH = Math.max(m.minHeight, MIN_HEIGHT)
  const total = totalVisualLines(m)
  let h = Math.max(total, minH)
  if (m.maxHeight > 0) {
    h = Math.min(h, m.maxHeight)
  }
  const maxOffset = total - h
  if (m.viewport.yOffset > maxOffset) {
    m.viewport.yOffset = Math.max(0, maxOffset)
  }
  m = SetHeight(m, h)
  return m
}

function atContentLimit(m: TextareaModel): boolean {
  if (m.maxContentHeight > 0) {
    return totalVisualLines(m) >= m.maxContentHeight
  }
  return m.maxHeight > 0 && m.value.length >= m.maxHeight
}

function mergeLineBelow(m: TextareaModel, row: number): TextareaModel {
  if (row >= m.value.length - 1) return m

  m.value[row] = m.value[row]! + m.value[row + 1]!

  for (let i = row + 1; i < m.value.length - 1; i++) {
    m.value[i] = m.value[i + 1]!
  }

  if (m.value.length > 0) {
    m.value = m.value.slice(0, m.value.length - 1)
  }

  return m
}

function mergeLineAbove(m: TextareaModel, row: number): TextareaModel {
  if (row <= 0) return m

  m.col = m.value[row - 1]!.length
  m.row = m.row - 1

  m.value[row - 1] = m.value[row - 1]! + m.value[row]!

  for (let i = row; i < m.value.length - 1; i++) {
    m.value[i] = m.value[i + 1]!
  }

  if (m.value.length > 0) {
    m.value = m.value.slice(0, m.value.length - 1)
  }

  return m
}

function splitLine(m: TextareaModel, row: number, col: number): TextareaModel {
  const head = m.value[row]!.slice(0, col)
  const tail = m.value[row]!.slice(col)

  const newGrid: string[] = []
  for (let i = 0; i <= row; i++) {
    newGrid.push(m.value[i]!)
  }
  newGrid.push(tail)
  for (let i = row + 1; i < m.value.length; i++) {
    newGrid.push(m.value[i]!)
  }

  m.value = newGrid
  m.value[row] = head
  m.value[row + 1] = tail

  m.col = 0
  m.row++

  return m
}

function wrapFn(lineArr: string, width: number): string[] {
  const lines: string[] = [""]
  let word = ""
  let row = 0
  let spaces = 0

  for (const r of lineArr) {
    if (isSpace(r)) {
      spaces++
    } else {
      word += r
    }

    if (spaces > 0) {
      const lineStr = lines[row]!
      const wordStr = word
      if (getStringWidth(lineStr) + getStringWidth(wordStr) + spaces > width) {
        row++
        lines.push(word)
        lines[row] += " ".repeat(spaces)
        spaces = 0
        word = ""
      } else {
        lines[row] += word
        lines[row] += " ".repeat(spaces)
        spaces = 0
        word = ""
      }
    } else {
      if (word.length > 0) {
        const wordStr = word
        const lastCharLen = 1
        if (getStringWidth(wordStr) + lastCharLen > width) {
          if (lines[row]!.length > 0) {
            row++
            lines.push("")
          }
          lines[row] += word
          word = ""
        }
      }
    }
  }

  const lineStr = lines[row]!
  const wordStr = word
  if (getStringWidth(lineStr) + getStringWidth(wordStr) + spaces >= width) {
    lines.push("")
    lines[row + 1] += word
    spaces++
    lines[row + 1] += " ".repeat(spaces)
  } else {
    lines[row] += word
    spaces++
    lines[row] += " ".repeat(spaces)
  }

  return lines
}

function lineNumberView(m: TextareaModel, n: number, isCursorLine: boolean): string {
  if (!m.showLineNumbers) return ""

  let str: string
  if (n <= 0) {
    str = " "
  } else {
    str = n.toString()
  }

  let textStyle = computedText(activeStyle(m))
  let lineNumberStyle = computedLineNumber(activeStyle(m))
  if (isCursorLine) {
    textStyle = computedCursorLine(activeStyle(m))
    lineNumberStyle = computedCursorLineNumber(activeStyle(m))
  }

  const digits = numDigits(m.maxHeight)
  str = " " + str.padStart(digits) + " "

  return textStyle.render(lineNumberStyle.render(str))
}

function promptView(m: TextareaModel, displayLine: number): string {
  let prompt = m.prompt
  if (m.promptFunc !== null) {
    prompt = m.promptFunc({
      lineNumber: displayLine,
      focused: m.focus,
    })
    const width = getStringWidth(prompt)
    if (width < m.promptWidth) {
      prompt = " ".repeat(m.promptWidth - width) + prompt
    }
  }
  return computedPrompt(activeStyle(m)).render(prompt)
}

function placeholderView(m: TextareaModel): string {
  const s: string[] = []
  const p = m.placeholder
  const styles = activeStyle(m)

  const pwordwrap = wordWrap(p, m.width)
  const pwrap = hardWrap(pwordwrap, m.width)
  const plines = pwrap.trim().split("\n")

  for (let i = 0; i < m.height; i++) {
    const isLineNumber = plines.length > i

    let lineStyle = computedPlaceholder(styles)
    if (plines.length > i) {
      lineStyle = computedCursorLine(styles)
    }

    let prompt = promptView(m, i)
    prompt = computedPrompt(styles).render(prompt)
    s.push(lineStyle.render(prompt))

    if (m.showLineNumbers) {
      let ln = 0
      if (i === 0) {
        ln = i + 1
        s.push(lineNumberView(m, ln, isLineNumber))
      } else if (plines.length > i) {
        s.push(lineNumberView(m, ln, isLineNumber))
      }
    }

    if (i === 0) {
      m.virtualCursor.textStyle = computedPlaceholder(styles)

      const ch = plines[0]!.charAt(0) || " "
      const rest = plines[0]!.slice(1)
      m.virtualCursor.char = ch
      s.push(lineStyle.render(CursorView(m.virtualCursor)))
      s.push(lineStyle.render(computedPlaceholder(styles).render(rest)))

      const gap = " ".repeat(Math.max(0, m.width - getStringWidth(plines[0]!)))
      s.push(lineStyle.render(gap))
    } else if (plines.length > i) {
      const placeholderLine = plines[i]!
      const gap = " ".repeat(Math.max(0, m.width - getStringWidth(placeholderLine)))
      s.push(lineStyle.render(placeholderLine + gap))
    } else {
      const eob = computedEndOfBuffer(styles).render(m.endOfBufferCharacter)
      s.push(eob)
    }

    s.push("\n")
  }

  const content = s.join("")
  m.viewport = ViewportSetContent(m.viewport, content)
  return styles.base.render(ViewportView(m.viewport))
}

function viewFn(m: TextareaModel): string {
  if (Value(m).length === 0 && m.row === 0 && m.col === 0 && m.placeholder !== "") {
    return placeholderView(m)
  }
  m.virtualCursor.textStyle = computedCursorLine(activeStyle(m))

  const s: string[] = []
  const styles = activeStyle(m)
  const lineInfo = LineInfo_fn(m)
  let newLines = 0
  let widestLineNumber = 0

  let displayLine = 0
  for (let l = 0; l < m.value.length; l++) {
    const wrappedLines = memoizedWrap(m, m.value[l]!, m.width)

    let style: StyleType
    if (m.row === l) {
      style = computedCursorLine(styles)
    } else {
      style = computedText(styles)
    }

    for (let wl = 0; wl < wrappedLines.length; wl++) {
      const wrappedLine = wrappedLines[wl]!

      let prompt = promptView(m, displayLine)
      prompt = computedPrompt(styles).render(prompt)
      s.push(style.render(prompt))
      displayLine++

      if (m.showLineNumbers) {
        if (wl === 0) {
          const isCursorLine = m.row === l
          s.push(lineNumberView(m, l + 1, isCursorLine))
        } else {
          const isCursorLine = m.row === l
          s.push(lineNumberView(m, -1, isCursorLine))
        }
      }

      const strwidth = getStringWidth(wrappedLine)
      let padding = m.width - strwidth

      let displayWrappedLine = wrappedLine
      if (strwidth > m.width) {
        const trimmed = wrappedLine.endsWith(" ") ? wrappedLine.slice(0, -1) : wrappedLine
        displayWrappedLine = trimmed
        padding = m.width - getStringWidth(trimmed)
      }

      if (m.row === l && lineInfo.rowOffset === wl) {
        s.push(style.render(displayWrappedLine.slice(0, lineInfo.columnOffset)))
        if (m.col >= m.value[l]!.length && lineInfo.charOffset >= m.width) {
          m.virtualCursor.char = " "
          s.push(CursorView(m.virtualCursor))
        } else {
          m.virtualCursor.char = displayWrappedLine.charAt(lineInfo.columnOffset) || " "
          s.push(CursorView(m.virtualCursor))
          s.push(style.render(displayWrappedLine.slice(lineInfo.columnOffset + 1)))
        }
      } else {
        s.push(style.render(displayWrappedLine))
      }

      s.push(style.render(" ".repeat(Math.max(0, padding))))
      s.push("\n")
      newLines++
    }
  }

  for (let i = 0; i < m.height; i++) {
    s.push(promptView(m, displayLine))
    displayLine++

    const leftGutter = m.endOfBufferCharacter
    const rightGapWidth = m.width - getStringWidth(leftGutter) + widestLineNumber
    const rightGap = " ".repeat(Math.max(0, rightGapWidth))
    s.push(computedEndOfBuffer(styles).render(leftGutter + rightGap))
    s.push("\n")
  }

  return s.join("")
}

export function Update(m: TextareaModel, msg: Msg): [TextareaModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  if (!m.focus) {
    m.virtualCursor = CursorBlur(m.virtualCursor)
    return [m, null]
  }

  const oldRow = cursorLineNumber(m)
  const oldCol = m.col

  const cmds: Cmd[] = []

  if (m.value[m.row] === undefined) {
    m.value[m.row] = ""
  }

  if (m.maxHeight > 0) {
    m.cache = new Map()
  }

  if (msg.type === "paste") {
    m = insertRunesFromUserInput(m, [...(msg as any).content])
  } else if (msg.type === "pasteErrMsg") {
    m.err = (msg as any).error
  } else if (msg.type === "key") {
    const key = msg as any

    if (Matches(m.keyMap.DeleteAfterCursor, key)) {
      m.col = clamp(m.col, 0, m.value[m.row]!.length)
      if (m.col >= m.value[m.row]!.length) {
        m = mergeLineBelow(m, m.row)
      } else {
        m = deleteAfterCursor(m)
      }
    } else if (Matches(m.keyMap.DeleteBeforeCursor, key)) {
      m.col = clamp(m.col, 0, m.value[m.row]!.length)
      if (m.col <= 0) {
        m = mergeLineAbove(m, m.row)
      } else {
        m = deleteBeforeCursor(m)
      }
    } else if (Matches(m.keyMap.DeleteCharacterBackward, key)) {
      m.col = clamp(m.col, 0, m.value[m.row]!.length)
      if (m.col <= 0) {
        m = mergeLineAbove(m, m.row)
      } else {
        if (m.value[m.row]!.length > 0) {
          m.value[m.row] = m.value[m.row]!.slice(0, Math.max(0, m.col - 1)) + m.value[m.row]!.slice(m.col)
          if (m.col > 0) {
            m = SetCursorColumn(m, m.col - 1)
          }
        }
      }
    } else if (Matches(m.keyMap.DeleteCharacterForward, key)) {
      if (m.value[m.row]!.length > 0 && m.col < m.value[m.row]!.length) {
        m.value[m.row] = m.value[m.row]!.slice(0, m.col) + m.value[m.row]!.slice(m.col + 1)
      }
      if (m.col >= m.value[m.row]!.length) {
        m = mergeLineBelow(m, m.row)
      }
    } else if (Matches(m.keyMap.DeleteWordBackward, key)) {
      if (m.col <= 0) {
        m = mergeLineAbove(m, m.row)
      } else {
        m = deleteWordLeft(m)
      }
    } else if (Matches(m.keyMap.DeleteWordForward, key)) {
      m.col = clamp(m.col, 0, m.value[m.row]!.length)
      if (m.col >= m.value[m.row]!.length) {
        m = mergeLineBelow(m, m.row)
      } else {
        m = deleteWordRight(m)
      }
    } else if (Matches(m.keyMap.InsertNewline, key)) {
      if (atContentLimit(m)) return [m, null]
      m.col = clamp(m.col, 0, m.value[m.row]!.length)
      m = splitLine(m, m.row, m.col)
    } else if (Matches(m.keyMap.LineEnd, key)) {
      m = CursorEnd(m)
    } else if (Matches(m.keyMap.LineStart, key)) {
      m = CursorStart(m)
    } else if (Matches(m.keyMap.CharacterForward, key)) {
      m = characterRight(m)
    } else if (Matches(m.keyMap.LineNext, key)) {
      m = CursorDown(m)
    } else if (Matches(m.keyMap.WordForward, key)) {
      m = wordRight(m)
    } else if (Matches(m.keyMap.Paste, key)) {
      return [m, ReadClipboard]
    } else if (Matches(m.keyMap.CharacterBackward, key)) {
      m = characterLeft(m, false)
    } else if (Matches(m.keyMap.LinePrevious, key)) {
      m = CursorUp(m)
    } else if (Matches(m.keyMap.WordBackward, key)) {
      m = wordLeft(m)
    } else if (Matches(m.keyMap.InputBegin, key)) {
      m = MoveToBegin(m)
    } else if (Matches(m.keyMap.InputEnd, key)) {
      m = MoveToEnd(m)
    } else if (Matches(m.keyMap.PageUp, key)) {
      m = PageUp_fn(m)
    } else if (Matches(m.keyMap.PageDown, key)) {
      m = PageDown_fn(m)
    } else if (Matches(m.keyMap.LowercaseWordForward, key)) {
      m = lowercaseRight(m)
    } else if (Matches(m.keyMap.UppercaseWordForward, key)) {
      m = uppercaseRight(m)
    } else if (Matches(m.keyMap.CapitalizeWordForward, key)) {
      m = capitalizeRight(m)
    } else if (Matches(m.keyMap.TransposeCharacterBackward, key)) {
      m = transposeLeft(m)
    } else {
      if (key.name && key.name.length === 1 && !key.ctrl && !key.alt && !key.meta) {
        m = insertRunesFromUserInput(m, [key.name])
      }
    }
  }

  m = recalculateHeight(m)

  const view = viewFn(m)
  m.viewport = ViewportSetContent(m.viewport, view)

  const [vp, cmd] = ViewportUpdate(m.viewport, msg)
  m.viewport = vp
  if (cmd) cmds.push(cmd)

  if (m.useVirtualCursor) {
    const [vc, cmd2] = CursorUpdate(m.virtualCursor, msg)
    m.virtualCursor = vc

    const newRow = cursorLineNumber(m)
    const newCol = m.col
    if ((newRow !== oldRow || newCol !== oldCol) && m.virtualCursor.mode === "blink") {
      m.virtualCursor.isBlinked = false
      if (cmd2) cmds.push(cmd2)
    } else if (cmd2) {
      cmds.push(cmd2)
    }
  }

  m = repositionView(m)

  const batchCmd = cmds.length > 0 ? cmds[cmds.length - 1] : null
  return [m, batchCmd]
}

export function View(m: TextareaModel): string {
  m.viewport = ViewportSetContent(m.viewport, viewFn(m))
  const view = ViewportView(m.viewport)
  return activeStyle(m).base.render(view)
}

function wordWrap(str: string, width: number): string {
  if (width <= 0) return str
  const words = str.split(" ")
  const result: string[] = []
  let currentLine = ""
  let currentWidth = 0

  for (const word of words) {
    const wordWidth = getStringWidth(word)
    const spaceWidth = currentLine ? 1 : 0

    if (currentWidth + spaceWidth + wordWidth > width && currentLine) {
      result.push(currentLine)
      currentLine = word
      currentWidth = wordWidth
    } else {
      currentLine = currentLine ? currentLine + " " + word : word
      currentWidth += spaceWidth + wordWidth
    }
  }

  if (currentLine) {
    result.push(currentLine)
  }

  return result.join("\n")
}

function hardWrap(str: string, width: number): string {
  const lines = str.split("\n")
  const result: string[] = []

  for (const line of lines) {
    if (getStringWidth(line) <= width) {
      result.push(line)
      continue
    }

    let current = ""
    let currentWidth = 0

    for (const char of line) {
      if (currentWidth >= width) {
        result.push(current)
        current = ""
        currentWidth = 0
      }
      current += char
      currentWidth++
    }

    if (current) result.push(current)
  }

  return result.join("\n")
}

function numDigits(n: number): number {
  if (n === 0) return 1
  let count = 0
  let num = Math.abs(n)
  while (num > 0) {
    count++
    num = Math.floor(num / 10)
  }
  return count
}

function clamp(v: number, low: number, high: number): number {
  if (high < low) {
    const temp = low
    low = high
    high = temp
  }
  return Math.min(high, Math.max(low, v))
}

function isSpace(r: string): boolean {
  return /\s/.test(r)
}
