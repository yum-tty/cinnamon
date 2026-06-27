import type { Model, Msg, Cmd, PasteMsg, Cursor as RealCursor, CursorShape } from "cinnamon-bun"
import { NewStyle, type Style as StyleType, LightDark, Style } from "caramel"
import { Cursor as NewCursor, type CursorModel, Focus as CursorFocus, Blur as CursorBlur, SetChar, Update as CursorUpdate, View as CursorView, SetMode } from "./cursor"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"
import { ReadClipboard } from "cinnamon-bun"

export type EchoMode = "normal" | "password" | "none"

export type ValidateFunc = (value: string) => Error | null

export interface StyleState {
  text: StyleType
  placeholder: StyleType
  suggestion: StyleType
  prompt: StyleType
}

export interface CursorStyle {
  color: string | null
  shape: CursorShape
  blink: boolean
  blinkSpeed: number
}

export interface TextInputStyles {
  focused: StyleState
  blurred: StyleState
  cursor: CursorStyle
}

export function DefaultStyles(isDark: boolean): TextInputStyles {
  const lightDark = LightDark(isDark)
  return {
    focused: {
      text: NewStyle(),
      placeholder: NewStyle().foreground(lightDark("#666666", "#666666")),
      suggestion: NewStyle().foreground(lightDark("#666666", "#666666")),
      prompt: NewStyle().foreground(lightDark("#555555", "#7")),
    },
    blurred: {
      text: NewStyle().foreground(lightDark("#555555", "#7")),
      placeholder: NewStyle().foreground(lightDark("#666666", "#666666")),
      suggestion: NewStyle().foreground(lightDark("#666666", "#666666")),
      prompt: NewStyle().foreground(lightDark("#555555", "#7")),
    },
    cursor: {
      color: "#7",
      shape: "block",
      blink: true,
      blinkSpeed: 500,
    },
  }
}

export function DefaultDarkStyles(): TextInputStyles {
  return DefaultStyles(true)
}

export function DefaultLightStyles(): TextInputStyles {
  return DefaultStyles(false)
}

export interface TextInputKeyMap {
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
  AcceptSuggestion: Binding
  NextSuggestion: Binding
  PrevSuggestion: Binding
}

export function DefaultKeyMap(): TextInputKeyMap {
  return {
    CharacterForward: NewBinding({ keys: ["right", "ctrl+f"] }),
    CharacterBackward: NewBinding({ keys: ["left", "ctrl+b"] }),
    WordForward: NewBinding({ keys: ["alt+right", "ctrl+right", "alt+f"] }),
    WordBackward: NewBinding({ keys: ["alt+left", "ctrl+left", "alt+b"] }),
    DeleteWordBackward: NewBinding({ keys: ["alt+backspace", "ctrl+w"] }),
    DeleteWordForward: NewBinding({ keys: ["alt+delete", "alt+d"] }),
    DeleteAfterCursor: NewBinding({ keys: ["ctrl+k"] }),
    DeleteBeforeCursor: NewBinding({ keys: ["ctrl+u"] }),
    DeleteCharacterBackward: NewBinding({ keys: ["backspace", "ctrl+h"] }),
    DeleteCharacterForward: NewBinding({ keys: ["delete", "ctrl+d"] }),
    LineStart: NewBinding({ keys: ["home", "ctrl+a"] }),
    LineEnd: NewBinding({ keys: ["end", "ctrl+e"] }),
    Paste: NewBinding({ keys: ["ctrl+v"] }),
    AcceptSuggestion: NewBinding({ keys: ["tab"] }),
    NextSuggestion: NewBinding({ keys: ["down", "ctrl+n"] }),
    PrevSuggestion: NewBinding({ keys: ["up", "ctrl+p"] }),
  }
}

export interface TextInputModel {
  err: Error | null
  prompt: string
  placeholder: string
  echoMode: EchoMode
  echoCharacter: string
  useVirtualCursor: boolean
  virtualCursor: CursorModel
  charLimit: number
  styles: TextInputStyles
  width: number
  keyMap: TextInputKeyMap
  value: string
  focus: boolean
  pos: number
  offset: number
  offsetRight: number
  validate: ValidateFunc | null
  showSuggestions: boolean
  suggestions: string[]
  matchedSuggestions: string[]
  currentSuggestionIndex: number
}

export function New(): TextInputModel {
  const m: TextInputModel = {
    err: null,
    prompt: "> ",
    placeholder: "",
    echoMode: "normal",
    echoCharacter: "*",
    useVirtualCursor: true,
    virtualCursor: NewCursor(),
    charLimit: 0,
    styles: DefaultDarkStyles(),
    width: 0,
    keyMap: DefaultKeyMap(),
    value: "",
    focus: false,
    pos: 0,
    offset: 0,
    offsetRight: 0,
    validate: null,
    showSuggestions: false,
    suggestions: [],
    matchedSuggestions: [],
    currentSuggestionIndex: 0,
  }
  return updateVirtualCursorStyle(m)
}

export function VirtualCursor(m: TextInputModel): boolean {
  return m.useVirtualCursor
}

export function SetVirtualCursor(m: TextInputModel, v: boolean): TextInputModel {
  return updateVirtualCursorStyle({ ...m, useVirtualCursor: v })
}

export function Styles(m: TextInputModel): TextInputStyles {
  return m.styles
}

export function SetStyles(m: TextInputModel, s: TextInputStyles): TextInputModel {
  return updateVirtualCursorStyle({ ...m, styles: s })
}

export function Width(m: TextInputModel): number {
  return m.width
}

export function SetWidth(m: TextInputModel, w: number): TextInputModel {
  return { ...m, width: w }
}

export function SetValue(m: TextInputModel, s: string): TextInputModel {
  const runes = sanitize(s)
  const err = validate(m, runes)
  return setValueInternal(m, runes, err)
}

function setValueInternal(m: TextInputModel, value: string, err: Error | null): TextInputModel {
  const empty = m.value.length === 0
  let newValue = value
  if (m.charLimit > 0 && value.length > m.charLimit) {
    newValue = value.slice(0, m.charLimit)
  }
  let newM = { ...m, value: newValue, err }
  if ((newM.pos === 0 && empty) || newM.pos > newM.value.length) {
    newM = setCursorPos(newM, newM.value.length)
  }
  return handleOverflow(newM)
}

export function Value(m: TextInputModel): string {
  return m.value
}

export function Position(m: TextInputModel): number {
  return m.pos
}

export function setCursorPos(m: TextInputModel, pos: number): TextInputModel {
  const clamped = Math.max(0, Math.min(pos, m.value.length))
  return handleOverflow({ ...m, pos: clamped })
}

export function CursorStart(m: TextInputModel): TextInputModel {
  return setCursorPos(m, 0)
}

export function CursorEnd(m: TextInputModel): TextInputModel {
  return setCursorPos(m, m.value.length)
}

export function Focused(m: TextInputModel): boolean {
  return m.focus
}

export function Focus(m: TextInputModel): [TextInputModel, Cmd] {
  const [vc, cmd] = CursorFocus(m.virtualCursor)
  return [{ ...m, focus: true, virtualCursor: vc }, cmd]
}

export function Blur(m: TextInputModel): TextInputModel {
  return { ...m, focus: false, virtualCursor: CursorBlur(m.virtualCursor) }
}

export function Reset(m: TextInputModel): TextInputModel {
  const newM = { ...m, value: "", pos: 0, offset: 0, offsetRight: 0, err: null }
  return handleOverflow(newM)
}

export function SetSuggestions(m: TextInputModel, suggestions: string[]): TextInputModel {
  const newM: TextInputModel = { ...m, suggestions, matchedSuggestions: [], currentSuggestionIndex: 0 }
  return updateSuggestions(newM)
}

export function AvailableSuggestions(m: TextInputModel): string[] {
  return m.suggestions
}

export function MatchedSuggestions(m: TextInputModel): string[] {
  return m.matchedSuggestions
}

export function CurrentSuggestionIndex(m: TextInputModel): number {
  return m.currentSuggestionIndex
}

export function CurrentSuggestion(m: TextInputModel): string {
  if (m.currentSuggestionIndex >= m.matchedSuggestions.length) {
    return ""
  }
  return m.matchedSuggestions[m.currentSuggestionIndex]
}

function canAcceptSuggestion(m: TextInputModel): boolean {
  return m.matchedSuggestions.length > 0
}

function updateSuggestions(m: TextInputModel): TextInputModel {
  if (!m.showSuggestions) return m
  if (m.value.length <= 0 || m.suggestions.length <= 0) {
    return { ...m, matchedSuggestions: [] }
  }
  const lowerValue = m.value.toLowerCase()
  const matches = m.suggestions.filter((s) => s.toLowerCase().startsWith(lowerValue))
  const prevMatched = m.matchedSuggestions
  let idx = m.currentSuggestionIndex
  if (!arraysEqual(matches, prevMatched)) {
    idx = 0
  }
  return { ...m, matchedSuggestions: matches, currentSuggestionIndex: idx }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function nextSuggestion(m: TextInputModel): TextInputModel {
  let idx = m.currentSuggestionIndex + 1
  if (idx >= m.matchedSuggestions.length) idx = 0
  return { ...m, currentSuggestionIndex: idx }
}

function previousSuggestion(m: TextInputModel): TextInputModel {
  let idx = m.currentSuggestionIndex - 1
  if (idx < 0) idx = m.matchedSuggestions.length - 1
  return { ...m, currentSuggestionIndex: idx }
}

function sanitize(s: string): string {
  return s.replace(/\t/g, " ").replace(/\n/g, " ")
}

function validate(m: TextInputModel, v: string): Error | null {
  if (m.validate) {
    return m.validate(v)
  }
  return null
}

function insertRunesFromUserInput(m: TextInputModel, runes: string): TextInputModel {
  const paste = sanitize(runes)
  let availSpace = paste.length
  if (m.charLimit > 0) {
    availSpace = m.charLimit - m.value.length
    if (availSpace <= 0) return m
    if (availSpace < paste.length) {
      return insertRunesInternal(m, paste.slice(0, availSpace))
    }
  }
  return insertRunesInternal(m, paste)
}

function insertRunesInternal(m: TextInputModel, runes: string): TextInputModel {
  const head = m.value.slice(0, m.pos) + runes
  const tail = m.value.slice(m.pos)
  const newPos = m.pos + runes.length
  const value = head + tail
  const err = validate(m, value)
  const newM: TextInputModel = { ...m, pos: newPos, err }
  return setValueInternal(newM, value, err)
}

function handleOverflow(m: TextInputModel): TextInputModel {
  if (m.width <= 0 || Style.width(m.value) <= m.width) {
    return { ...m, offset: 0, offsetRight: m.value.length }
  }
  let newM = { ...m }
  newM.offsetRight = Math.min(newM.offsetRight, newM.value.length)
  if (newM.pos < newM.offset) {
    newM.offset = newM.pos
    let w = 0
    const runes = newM.value.slice(newM.offset)
    let i = 0
    while (i < runes.length && w <= newM.width) {
      w += Style.width(runes[i]!)
      if (w <= newM.width + 1) i++
    }
    newM.offsetRight = newM.offset + i
  } else if (newM.pos >= newM.offsetRight) {
    newM.offsetRight = newM.pos
    const runes = newM.value.slice(0, newM.offsetRight)
    let w = 0
    let i = runes.length - 1
    while (i > 0 && w < newM.width) {
      w += Style.width(runes[i]!)
      if (w <= newM.width) i--
    }
    newM.offset = newM.offsetRight - (runes.length - 1 - i)
  }
  return newM
}

function deleteBeforeCursor(m: TextInputModel): TextInputModel {
  const value = m.value.slice(m.pos)
  const err = validate(m, value)
  let newM: TextInputModel = { ...m, value, err, offset: 0 }
  newM = setCursorPos(newM, 0)
  return newM
}

function deleteAfterCursor(m: TextInputModel): TextInputModel {
  const value = m.value.slice(0, m.pos)
  const err = validate(m, value)
  const newM: TextInputModel = { ...m, value, err }
  return setCursorPos(newM, newM.value.length)
}

function isSpace(ch: string): boolean {
  return /\s/.test(ch)
}

function deleteWordBackward(m: TextInputModel): TextInputModel {
  if (m.pos === 0 || m.value.length === 0) return m
  if (m.echoMode !== "normal") return deleteBeforeCursor(m)
  const oldPos = m.pos
  let newPos = m.pos - 1
  while (newPos >= 0 && isSpace(m.value[newPos]!)) {
    newPos--
  }
  while (newPos > 0) {
    if (!isSpace(m.value[newPos - 1]!)) {
      newPos--
    } else {
      break
    }
  }
  const value = m.value.slice(0, newPos) + m.value.slice(oldPos)
  const err = validate(m, value)
  return setCursorPos({ ...m, value, err }, newPos)
}

function deleteWordForward(m: TextInputModel): TextInputModel {
  if (m.pos >= m.value.length || m.value.length === 0) return m
  if (m.echoMode !== "normal") return deleteAfterCursor(m)
  const oldPos = m.pos
  let newPos = m.pos
  while (newPos < m.value.length && isSpace(m.value[newPos]!)) {
    newPos++
  }
  while (newPos < m.value.length && !isSpace(m.value[newPos]!)) {
    newPos++
  }
  const value = m.value.slice(0, oldPos) + m.value.slice(newPos)
  const err = validate(m, value)
  return setCursorPos({ ...m, value, err }, oldPos)
}

function wordForward(m: TextInputModel): TextInputModel {
  if (m.pos >= m.value.length || m.value.length === 0) return m
  if (m.echoMode !== "normal") return CursorEnd(m)
  const chars = Array.from(m.value)
  let i = m.pos
  while (i < chars.length && isSpace(chars[i]!)) {
    i++
  }
  while (i < chars.length && !isSpace(chars[i]!)) {
    i++
  }
  return setCursorPos(m, i)
}

function wordBackward(m: TextInputModel): TextInputModel {
  if (m.pos === 0 || m.value.length === 0) return m
  if (m.echoMode !== "normal") return CursorStart(m)
  const chars = Array.from(m.value)
  let i = m.pos - 1
  while (i >= 0 && isSpace(chars[i]!)) {
    i--
  }
  while (i > 0 && !isSpace(chars[i - 1]!)) {
    i--
  }
  return setCursorPos(m, i)
}

function echoTransform(m: TextInputModel, v: string): string {
  switch (m.echoMode) {
    case "password":
      return m.echoCharacter.repeat(Style.width(v))
    case "none":
      return ""
    default:
      return v
  }
}

function completionView(m: TextInputModel, offset: number): string {
  if (!canAcceptSuggestion(m)) return ""
  const suggestion = m.matchedSuggestions[m.currentSuggestionIndex]
  if (m.value.length < suggestion.length) {
    return activeStyle(m).suggestion.inline(true).render(suggestion.slice(m.value.length + offset))
  }
  return ""
}

function placeholderView(m: TextInputModel): string {
  const styles = activeStyle(m)
  const render = styles.placeholder
  const promptStr = styles.prompt.render(m.prompt)

  const p = m.placeholder.padEnd(m.width + 1)

  let vc = { ...m.virtualCursor, textStyle: styles.placeholder }
  vc = SetChar(vc, p[0] || " ")
  let v = CursorView(vc)

  if (m.width < 1 && p.length <= 1) {
    return promptStr + v
  }

  if (m.width > 0) {
    const minWidth = Style.width(m.placeholder)
    let availWidth = m.width - minWidth + 1
    if (availWidth < 0) {
      v += render.render(p.slice(1, minWidth + availWidth))
      availWidth = 0
    } else {
      v += render.render(p.slice(1, minWidth))
    }
    v += render.render(" ".repeat(availWidth))
  } else {
    v += render.render(p.slice(1))
  }

  return promptStr + v
}

function promptView(m: TextInputModel): string {
  return activeStyle(m).prompt.render(m.prompt)
}

function updateVirtualCursorStyle(m: TextInputModel): TextInputModel {
  if (!m.useVirtualCursor) {
    const [vc] = SetMode(m.virtualCursor, "hide")
    return { ...m, virtualCursor: vc }
  }
  const style = m.styles.cursor
  let vc = { ...m.virtualCursor, style: NewStyle().foreground(style.color || "#7").reverse(true) }
  if (style.blink) {
    if (style.blinkSpeed > 0) {
      vc = { ...vc, blinkSpeed: style.blinkSpeed }
    }
    const [newVc] = SetMode(vc, "blink")
    return { ...m, virtualCursor: newVc }
  }
  const [newVc] = SetMode(vc, "static")
  return { ...m, virtualCursor: newVc }
}

function activeStyle(m: TextInputModel): StyleState {
  return m.focus ? m.styles.focused : m.styles.blurred
}

export function Cursor(m: TextInputModel): RealCursor | null {
  if (m.useVirtualCursor || !Focused(m)) return null
  const promptWidth = Style.width(promptView(m))
  let xOffset = Position(m) + promptWidth
  if (m.width > 0) {
    xOffset = Math.min(xOffset, m.width + promptWidth)
  }
  const style = m.styles.cursor
  return {
    x: xOffset,
    y: 0,
    color: style.color || undefined,
    shape: style.shape,
    blink: style.blink,
  }
}

export function Blink(): Cmd {
  return () => Promise.resolve({ type: "initialBlink" } as any)
}

export function Paste(): Cmd {
  return () => ReadClipboard()
}

export function Update(m: TextInputModel, msg: Msg): [TextInputModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]
  if (["blink", "initialBlink", "blinkCanceled"].includes(msg.type)) {
    const [vc, cmd] = CursorUpdate(m.virtualCursor, msg)
    return [{ ...m, virtualCursor: vc }, cmd]
  }
  if (!m.focus) return [m, null]
  if (msg.type === "paste") {
    const pasteMsg = msg as PasteMsg
    const newM = insertRunesFromUserInput(m, pasteMsg.content)
    return [updateSuggestions(newM), null]
  }
  if (msg.type === "clipboard") {
    const clipboardMsg = msg as { type: string; content: string }
    const newM = insertRunesFromUserInput(m, clipboardMsg.content)
    return [updateSuggestions(newM), null]
  }
  if (msg.type !== "key") return [m, null]
  const key = msg as any
  const oldPos = m.pos
  let newM = m

  if (Matches(newM.keyMap.AcceptSuggestion as any, key) && canAcceptSuggestion(newM)) {
    const suggestion = newM.matchedSuggestions[newM.currentSuggestionIndex]
    newM = { ...newM, value: suggestion }
    newM = CursorEnd(newM)
  } else if (Matches(newM.keyMap.DeleteWordBackward as any, key)) {
    newM = deleteWordBackward(newM)
  } else if (Matches(newM.keyMap.DeleteCharacterBackward as any, key)) {
    if (newM.value.length > 0) {
      const value = newM.value.slice(0, Math.max(0, newM.pos - 1)) + newM.value.slice(newM.pos)
      const err = validate(newM, value)
      newM = { ...newM, value, err }
      if (newM.pos > 0) {
        newM = setCursorPos(newM, newM.pos - 1)
      }
    }
  } else if (Matches(newM.keyMap.WordBackward as any, key)) {
    newM = wordBackward(newM)
  } else if (Matches(newM.keyMap.CharacterBackward as any, key)) {
    if (newM.pos > 0) {
      newM = setCursorPos(newM, newM.pos - 1)
    }
  } else if (Matches(newM.keyMap.WordForward as any, key)) {
    newM = wordForward(newM)
  } else if (Matches(newM.keyMap.CharacterForward as any, key)) {
    if (newM.pos < newM.value.length) {
      newM = setCursorPos(newM, newM.pos + 1)
    }
  } else if (Matches(newM.keyMap.LineStart as any, key)) {
    newM = CursorStart(newM)
  } else if (Matches(newM.keyMap.DeleteCharacterForward as any, key)) {
    if (newM.value.length > 0 && newM.pos < newM.value.length) {
      const value = newM.value.slice(0, newM.pos) + newM.value.slice(newM.pos + 1)
      const err = validate(newM, value)
      newM = { ...newM, value, err }
    }
  } else if (Matches(newM.keyMap.LineEnd as any, key)) {
    newM = CursorEnd(newM)
  } else if (Matches(newM.keyMap.DeleteAfterCursor as any, key)) {
    newM = deleteAfterCursor(newM)
  } else if (Matches(newM.keyMap.DeleteBeforeCursor as any, key)) {
    newM = deleteBeforeCursor(newM)
  } else if (Matches(newM.keyMap.Paste as any, key)) {
    return [newM, Paste()]
  } else if (Matches(newM.keyMap.DeleteWordForward as any, key)) {
    newM = deleteWordForward(newM)
  } else if (Matches(newM.keyMap.NextSuggestion as any, key)) {
    newM = nextSuggestion(newM)
  } else if (Matches(newM.keyMap.PrevSuggestion as any, key)) {
    newM = previousSuggestion(newM)
  } else if (key.name && key.name.length === 1 && !key.ctrl && !key.alt && !key.meta) {
    newM = insertRunesFromUserInput(newM, key.name)
  }

  newM = updateSuggestions(newM)
  const cmds: Cmd[] = []

  if (newM.useVirtualCursor) {
    const char = newM.value[newM.pos] || " "
    let vc = SetChar(newM.virtualCursor, char)
    if (oldPos !== newM.pos && newM.virtualCursor.mode === "blink") {
      vc = { ...vc, isBlinked: false }
      const blinkCmd = () => Promise.resolve({ type: "initialBlink" } as any)
      cmds.push(blinkCmd)
    }
    newM = { ...newM, virtualCursor: vc }
  }

  newM = handleOverflow(newM)
  if (cmds.length > 0) {
    return [newM, () => Promise.resolve({ type: "batch", cmds } as any)]
  }
  return [newM, null]
}

export function View(m: TextInputModel): string {
  if (m.value.length === 0 && m.placeholder !== "") {
    return placeholderView(m)
  }

  const styles = activeStyle(m)
  const styleText = (s: string) => styles.text.inline(true).render(s)

  const value = m.value.slice(m.offset, m.offsetRight)
  const pos = Math.max(0, m.pos - m.offset)
  let v = styleText(echoTransform(m, value.slice(0, pos)))

  if (pos < value.length) {
    const char = echoTransform(m, value[pos] || " ")
    let vc = SetChar(m.virtualCursor, char)
    vc = { ...vc, style: m.styles.cursor.color ? NewStyle().foreground(m.styles.cursor.color).reverse(true) : NewStyle().reverse(true) }
    v += CursorView(vc)
    v += styleText(echoTransform(m, value.slice(pos + 1)))
    v += completionView(m, 0)
  } else {
    if (m.focus && canAcceptSuggestion(m)) {
      const suggestion = m.matchedSuggestions[m.currentSuggestionIndex]
      if (value.length < suggestion.length) {
        let vc = { ...m.virtualCursor, textStyle: styles.suggestion }
        vc = SetChar(vc, echoTransform(m, suggestion[value.length] || " "))
        v += CursorView(vc)
        v += completionView(m, 1)
      } else {
        let vc = SetChar(m.virtualCursor, " ")
        v += CursorView(vc)
      }
    } else {
      let vc = SetChar(m.virtualCursor, " ")
      v += CursorView(vc)
    }
  }

  const valWidth = Style.width(value)
  if (m.width > 0 && valWidth <= m.width) {
    let padding = Math.max(0, m.width - valWidth)
    if (valWidth + padding <= m.width && pos < value.length) {
      padding++
    }
    v += styleText(" ".repeat(padding))
  }

  return promptView(m) + v
}
