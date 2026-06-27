// viewport.ts | scrollable viewport component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { NewStyle, type Style as StyleType, getStringWidth } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

const DefaultHorizontalStep = 6

export interface GutterContext {
  index: number
  totalLines: number
  soft: boolean
}

export type GutterFunc = (ctx: GutterContext) => string

export const NoGutter: GutterFunc = () => ""

export interface ViewportKeyMap {
  PageDown: Binding
  PageUp: Binding
  HalfPageDown: Binding
  HalfPageUp: Binding
  Up: Binding
  Down: Binding
  Left: Binding
  Right: Binding
}

export function DefaultViewportKeyMap(): ViewportKeyMap {
  return {
    PageDown: NewBinding({ keys: ["pgdown", "f", "ctrl+f", " "] }),
    PageUp: NewBinding({ keys: ["pgup", "b", "ctrl+b"] }),
    HalfPageDown: NewBinding({ keys: ["d", "ctrl+d"] }),
    HalfPageUp: NewBinding({ keys: ["u", "ctrl+u"] }),
    Up: NewBinding({ keys: ["up", "k"] }),
    Down: NewBinding({ keys: ["down", "j"] }),
    Left: NewBinding({ keys: ["left", "h"] }),
    Right: NewBinding({ keys: ["right", "l"] }),
  }
}

export interface HighlightInfo {
  lineStart: number
  lineEnd: number
  lines: Map<number, [number, number]>
}

export interface ViewportModel {
  yOffset: number
  xOffset: number
  width: number
  height: number
  lines: string[]
  longestLineWidth: number
  horizontalStep: number
  keyMap: ViewportKeyMap
  style: StyleType
  softWrap: boolean
  fillHeight: boolean
  yPosition: number
  mouseWheelEnabled: boolean
  mouseWheelDelta: number
  leftGutterFunc: GutterFunc
  highlights: HighlightInfo[]
  hiIdx: number
}

export function Viewport(width: number, height: number): ViewportModel {
  return {
    yOffset: 0,
    xOffset: 0,
    width,
    height,
    lines: [],
    longestLineWidth: 0,
    horizontalStep: DefaultHorizontalStep,
    keyMap: DefaultViewportKeyMap(),
    style: NewStyle(),
    softWrap: false,
    fillHeight: false,
    yPosition: 0,
    mouseWheelEnabled: true,
    mouseWheelDelta: 3,
    leftGutterFunc: NoGutter,
    highlights: [],
    hiIdx: -1,
  }
}

export function Height(m: ViewportModel): number {
  return m.height
}

export function SetHeight(m: ViewportModel, h: number): ViewportModel {
  return { ...m, height: h }
}

export function Width(m: ViewportModel): number {
  return m.width
}

export function SetWidth(m: ViewportModel, w: number): ViewportModel {
  return { ...m, width: w }
}

export function YOffset(m: ViewportModel): number {
  return m.yOffset
}

export function SetYOffset(m: ViewportModel, n: number): ViewportModel {
  return { ...m, yOffset: clamp(n, 0, maxYOffset(m)) }
}

export function XOffset(m: ViewportModel): number {
  return m.xOffset
}

export function SetXOffset(m: ViewportModel, n: number): ViewportModel {
  if (m.softWrap) return m
  return { ...m, xOffset: clamp(n, 0, maxXOffset(m)) }
}

export function SetHorizontalStep(m: ViewportModel, n: number): ViewportModel {
  return { ...m, horizontalStep: Math.max(0, n) }
}

export function HorizontalScrollPercent(m: ViewportModel): number {
  const lw = m.longestLineWidth
  if (m.xOffset >= lw - m.width) return 1
  if (lw <= m.width) return 0
  return clamp(m.xOffset / (lw - m.width), 0, 1)
}

export function AtTop(m: ViewportModel): boolean {
  return m.yOffset <= 0
}

export function AtBottom(m: ViewportModel): boolean {
  return m.yOffset >= maxYOffset(m)
}

export function PastBottom(m: ViewportModel): boolean {
  return m.yOffset > maxYOffset(m)
}

export function ScrollPercent(m: ViewportModel): number {
  const total = calculateTotalLines(m)
  if (m.height >= total) return 1
  return clamp(m.yOffset / (total - m.height), 0, 1)
}

export function SetContent(m: ViewportModel, content: string): ViewportModel {
  return SetContentLines(m, content.split("\n"))
}

export function SetContentLines(m: ViewportModel, lines: string[]): ViewportModel {
  let newLines = [...lines]
  if (newLines.length === 1 && getStringWidth(newLines[0]!) === 0) {
    newLines = []
  } else {
    const result: string[] = []
    for (let i = newLines.length - 1; i >= 0; i--) {
      const line = newLines[i]!.replace(/\r\n/g, "\n")
      if (!line.includes("\n")) {
        result.unshift(line)
      } else {
        const parts = line.split("\n")
        for (let j = parts.length - 1; j >= 0; j--) {
          result.unshift(parts[j]!)
        }
      }
    }
    newLines = result
  }

  const longestLineWidth = maxLineWidth(newLines)
  const newM: ViewportModel = { ...m, lines: newLines, longestLineWidth, highlights: [], hiIdx: -1 }

  if (newM.yOffset > maxYOffset(newM)) {
    const [bottomM] = GotoBottom(newM)
    return bottomM
  }
  return newM
}

export function GetContent(m: ViewportModel): string {
  return m.lines.join("\n")
}

export function ScrollLeft(m: ViewportModel, n: number = 1): ViewportModel {
  return SetXOffset(m, m.xOffset - n)
}

export function ScrollRight(m: ViewportModel, n: number = 1): ViewportModel {
  return SetXOffset(m, m.xOffset + n)
}

export function GotoTop(m: ViewportModel): [ViewportModel, string[]] {
  if (AtTop(m)) return [m, visibleLines(m)]
  const newM = { ...m, yOffset: 0 }
  return [newM, visibleLines(newM)]
}

export function GotoBottom(m: ViewportModel): [ViewportModel, string[]] {
  const newM = { ...m, yOffset: maxYOffset(m) }
  return [newM, visibleLines(newM)]
}

export function ScrollUp(m: ViewportModel, n: number = 1): ViewportModel {
  if (AtTop(m) || n === 0 || m.lines.length === 0) return m
  return { ...m, yOffset: Math.max(0, m.yOffset - n) }
}

export function ScrollDown(m: ViewportModel, n: number = 1): ViewportModel {
  if (AtBottom(m) || n === 0 || m.lines.length === 0) return m
  return { ...m, yOffset: Math.min(maxYOffset(m), m.yOffset + n) }
}

export function PageDown(m: ViewportModel): ViewportModel {
  if (AtBottom(m)) return m
  return ScrollDown(m, m.height)
}

export function PageUp(m: ViewportModel): ViewportModel {
  if (AtTop(m)) return m
  return ScrollUp(m, m.height)
}

export function HalfPageDown(m: ViewportModel): ViewportModel {
  if (AtBottom(m)) return m
  return ScrollDown(m, Math.floor(m.height / 2))
}

export function HalfPageUp(m: ViewportModel): ViewportModel {
  if (AtTop(m)) return m
  return ScrollUp(m, Math.floor(m.height / 2))
}

export function TotalLineCount(m: ViewportModel): number {
  return calculateTotalLines(m)
}

export function VisibleLineCount(m: ViewportModel): number {
  return visibleLines(m).length
}

export function EnsureVisible(m: ViewportModel, line: number, colStart: number, colEnd: number): ViewportModel {
  const mw = maxWidth(m)
  let newM: ViewportModel
  if (colEnd <= mw) {
    newM = SetXOffset(m, 0)
  } else {
    newM = SetXOffset(m, colStart - m.horizontalStep)
  }
  if (line < newM.yOffset || line >= newM.yOffset + maxVisibleHeight(newM)) {
    newM = SetYOffset(newM, line)
  }
  return newM
}

export function SetHighlights(m: ViewportModel, matches: number[][]): ViewportModel {
  if (matches.length === 0 || m.lines.length === 0) return m
  const content = GetContent(m)
  const highlights = parseMatches(content, matches)
  const hiIdx = highlights.length > 0 ? findNearestMatch(highlights, m.yOffset) : -1
  return showHighlight({ ...m, highlights, hiIdx })
}

export function ClearHighlights(m: ViewportModel): ViewportModel {
  return { ...m, highlights: [], hiIdx: -1 }
}

export function HighlightNext(m: ViewportModel): ViewportModel {
  if (m.highlights.length === 0) return m
  return showHighlight({ ...m, hiIdx: (m.hiIdx + 1) % m.highlights.length })
}

export function HighlightPrevious(m: ViewportModel): ViewportModel {
  if (m.highlights.length === 0) return m
  return showHighlight({ ...m, hiIdx: (m.hiIdx - 1 + m.highlights.length) % m.highlights.length })
}

export function Update(m: ViewportModel, msg: Msg): [ViewportModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  if (msg.type === "key") {
    const key = msg as any
    if (Matches(m.keyMap.PageDown as any, key)) return [PageDown(m), null]
    if (Matches(m.keyMap.PageUp as any, key)) return [PageUp(m), null]
    if (Matches(m.keyMap.HalfPageDown as any, key)) return [HalfPageDown(m), null]
    if (Matches(m.keyMap.HalfPageUp as any, key)) return [HalfPageUp(m), null]
    if (Matches(m.keyMap.Down as any, key)) return [ScrollDown(m, 1), null]
    if (Matches(m.keyMap.Up as any, key)) return [ScrollUp(m, 1), null]
    if (Matches(m.keyMap.Left as any, key)) return [ScrollLeft(m, m.horizontalStep), null]
    if (Matches(m.keyMap.Right as any, key)) return [ScrollRight(m, m.horizontalStep), null]
  }

  if (msg.type === "mouseWheel" && m.mouseWheelEnabled) {
    const wheel = msg as any
    if (wheel.shiftKey) {
      if (wheel.direction === "up") return [ScrollLeft(m, m.horizontalStep), null]
      if (wheel.direction === "down") return [ScrollRight(m, m.horizontalStep), null]
    }
    if (wheel.direction === "up") return [ScrollUp(m, m.mouseWheelDelta), null]
    if (wheel.direction === "down") return [ScrollDown(m, m.mouseWheelDelta), null]
    if (wheel.direction === "left") return [ScrollLeft(m, m.horizontalStep), null]
    if (wheel.direction === "right") return [ScrollRight(m, m.horizontalStep), null]
  }

  return [m, null]
}

export function View(m: ViewportModel): string {
  let w = m.width
  let h = m.height

  const sw = m.style.getWidth()
  if (sw !== 0) w = Math.min(w, sw)
  const sh = m.style.getHeight()
  if (sh !== 0) h = Math.min(h, sh)

  if (w === 0 || h === 0) return ""

  const contentWidth = w - m.style.getHorizontalFrameSize()
  const contentHeight = h - m.style.getVerticalFrameSize()
  const lines = visibleLines(m)
  const content = NewStyle().width(contentWidth).height(contentHeight).render(lines.join("\n"))
  return m.style.unsetWidth().unsetHeight().render(content)
}

// ── Internal helpers ──

function clamp(v: number, low: number, high: number): number {
  if (high < low) { const t = low; low = high; high = t }
  return Math.min(high, Math.max(low, v))
}

function maxYOffset(m: ViewportModel): number {
  const total = calculateTotalLines(m)
  return Math.max(0, total - m.height)
}

function calculateTotalLines(m: ViewportModel): number {
  if (!m.softWrap) return m.lines.length

  const mw = maxWidth(m)
  if (mw === 0) return m.lines.length

  let total = 0
  for (const line of m.lines) {
    const lw = getStringWidth(line)
    total += Math.max(1, Math.ceil(lw / mw))
  }
  return total
}

function calculateLine(m: ViewportModel, yoffset: number): { total: number; ridx: number; voffset: number } {
  if (!m.softWrap) {
    return {
      total: m.lines.length,
      ridx: Math.min(yoffset, m.lines.length),
      voffset: 0,
    }
  }

  const mw = maxWidth(m)
  if (mw === 0) {
    return {
      total: m.lines.length,
      ridx: Math.min(yoffset, m.lines.length),
      voffset: 0,
    }
  }

  let total = 0
  let ridx = m.lines.length
  let voffset = 0

  for (let i = 0; i < m.lines.length; i++) {
    const lw = getStringWidth(m.lines[i]!)
    const lineHeight = Math.max(1, Math.ceil(lw / mw))

    if (yoffset >= total && yoffset < total + lineHeight) {
      ridx = i
      voffset = yoffset - total
    }
    total += lineHeight
  }

  if (yoffset >= total) {
    ridx = m.lines.length
    voffset = 0
  }

  return { total, ridx, voffset }
}

function maxXOffset(m: ViewportModel): number {
  return Math.max(0, m.longestLineWidth - m.width)
}

function maxVisibleHeight(m: ViewportModel): number {
  return Math.max(0, m.height - m.style.getVerticalFrameSize())
}

function maxWidth(m: ViewportModel): number {
  let gutterSize = 0
  if (m.leftGutterFunc) {
    gutterSize = getStringWidth(m.leftGutterFunc({ index: 0, totalLines: 0, soft: false }))
  }
  return Math.max(0, m.width - m.style.getHorizontalFrameSize() - gutterSize)
}

function maxLineWidth(lines: string[]): number {
  let r = 0
  for (const l of lines) r = Math.max(r, getStringWidth(l))
  return r
}

function visibleLines(m: ViewportModel): string[] {
  const mh = maxVisibleHeight(m)
  const mw = maxWidth(m)
  if (mh === 0 || mw === 0) return []

  const { total, ridx, voffset } = calculateLine(m, m.yOffset)
  const bottom = Math.min(ridx + mh, m.lines.length)
  const lines = m.lines.slice(ridx, bottom).map((l) => l)

  if (m.leftGutterFunc) {
    for (let i = 0; i < lines.length; i++) {
      lines[i] = m.leftGutterFunc({ index: i + ridx, totalLines: total, soft: false }) + lines[i]!
    }
  }

  while (m.fillHeight && lines.length < mh) {
    lines.push("")
  }

  if ((m.xOffset === 0 && m.longestLineWidth <= mw) || mw === 0) {
    if (m.softWrap) return softWrap(lines, mw, mh, ridx, voffset, m.leftGutterFunc)
    return lines
  }

  if (m.softWrap) return softWrap(lines, mw, mh, ridx, voffset, m.leftGutterFunc)

  for (let i = 0; i < lines.length; i++) {
    lines[i] = truncateStr(lines[i]!, m.xOffset, m.xOffset + mw)
  }
  return lines
}

function softWrap(lines: string[], maxW: number, maxH: number, ridx: number, voffset: number, gutterFunc?: GutterFunc): string[] {
  const wrapped: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const lw = getStringWidth(line)
    if (lw <= maxW) {
      if (gutterFunc) {
        wrapped.push(gutterFunc({ index: i + ridx, totalLines: 0, soft: false }) + line)
      } else {
        wrapped.push(line)
      }
      continue
    }
    let idx = 0
    while (lw > idx) {
      const truncatedLine = truncateStr(line, idx, maxW + idx)
      if (gutterFunc) {
        wrapped.push(gutterFunc({ index: i + ridx, totalLines: 0, soft: idx > 0 }) + truncatedLine)
      } else {
        wrapped.push(truncatedLine)
      }
      idx += maxW
    }
  }
  return wrapped.slice(voffset, voffset + maxH)
}

function truncateStr(str: string, start: number, end: number): string {
  let w = 0
  let si = 0
  let ei = str.length
  for (let i = 0; i < str.length; i++) {
    if (w >= start && si === 0) si = i
    if (w >= end) { ei = i; break }
    w++
  }
  return w < start ? "" : str.slice(si, ei)
}

function findNearestMatch(hi: HighlightInfo[], yo: number): number {
  for (let i = 0; i < hi.length; i++) {
    if (hi[i]!.lineStart >= yo) return i
  }
  return -1
}

function showHighlight(m: ViewportModel): ViewportModel {
  if (m.hiIdx === -1 || m.hiIdx >= m.highlights.length) return m
  const hi = m.highlights[m.hiIdx]!
  const coords = getCoords(hi)
  return EnsureVisible(m, coords[0], coords[1], coords[2])
}

function getCoords(hi: HighlightInfo): [number, number, number] {
  for (let i = hi.lineStart; i <= hi.lineEnd; i++) {
    const hl = hi.lines.get(i)
    if (hl) return [i, hl[0], hl[1]]
  }
  return [hi.lineStart, 0, 0]
}

// ── Highlight parsing (grapheme-aware) ──

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
}

function parseMatches(content: string, matches: number[][]): HighlightInfo[] {
  if (matches.length === 0) return []

  const stripped = stripAnsi(content)
  const graphemes = [...stripped]
  const highlights: HighlightInfo[] = []

  for (const match of matches) {
    const byteStart = match[0]!
    const byteEnd = match[1]!

    let gp = 0
    let line = 0
    let prevOffset = 0
    let bi = 0
    let gi = 0

    while (bi < byteStart && gi < graphemes.length) {
      if (content[bi] === "\n") { prevOffset = gp + 1; line++ }
      gp += Math.max(1, graphemes[gi]!.length)
      bi += graphemes[gi]!.length
      gi++
    }

    const hi: HighlightInfo = { lineStart: line, lineEnd: line, lines: new Map() }
    const gs = gp

    while (bi < byteEnd && gi < graphemes.length) {
      if (content[bi] === "\n") {
        const cs = Math.max(0, gs - prevOffset)
        const ce = Math.max(gp - prevOffset + 1, cs)
        if (ce > cs) { hi.lines.set(line, [cs, ce]); hi.lineEnd = line }
        prevOffset = gp + 1
        line++
      }
      gp += Math.max(1, graphemes[gi]!.length)
      bi += graphemes[gi]!.length
      gi++
    }

    if (bi === byteEnd) {
      const cs = Math.max(0, gs - prevOffset)
      const ce = Math.max(gp - prevOffset, cs)
      if (ce > cs) { hi.lines.set(line, [cs, ce]); hi.lineEnd = line }
    }

    highlights.push(hi)
  }

  return highlights
}
