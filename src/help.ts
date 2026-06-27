// help.ts | help bar component (bubbles port)

import { Style } from "caramel"
import { type Binding, Enabled } from "./key"

/**
 * HelpStyles is a set of available style definitions for the Help bubble.
 */
export interface HelpStyles {
  ellipsis: Style
  shortKey: Style
  shortDesc: Style
  shortSeparator: Style
  fullKey: Style
  fullDesc: Style
  fullSeparator: Style
}

/**
 * DefaultStyles returns a set of default styles for the help bubble.
 * Light or dark styles can be selected by passing true or false to the isDark parameter.
 */
export function DefaultStyles(isDark: boolean): HelpStyles {
  const keyColor = isDark ? "#626262" : "#909090"
  const descColor = isDark ? "#4A4A4A" : "#B2B2B2"
  const sepColor = isDark ? "#3C3C3C" : "#DADADA"

  const keyStyle = new Style().foreground(keyColor)
  const descStyle = new Style().foreground(descColor)
  const sepStyle = new Style().foreground(sepColor)

  return {
    ellipsis: sepStyle,
    shortKey: keyStyle,
    shortDesc: descStyle,
    shortSeparator: sepStyle,
    fullKey: keyStyle,
    fullDesc: descStyle,
    fullSeparator: sepStyle,
  }
}

/**
 * DefaultDarkStyles returns a set of default styles for dark backgrounds.
 */
export function DefaultDarkStyles(): HelpStyles {
  return DefaultStyles(true)
}

/**
 * DefaultLightStyles returns a set of default styles for light backgrounds.
 */
export function DefaultLightStyles(): HelpStyles {
  return DefaultStyles(false)
}

/**
 * HelpModel is the state for the help component.
 */
export interface HelpModel {
  bindings: Binding[][]
  showAll: boolean
  shortSeparator: string
  fullSeparator: string
  ellipsis: string
  styles: HelpStyles
  width: number
}

/**
 * Help creates a new help model.
 */
export function Help(): HelpModel {
  return {
    bindings: [],
    showAll: false,
    shortSeparator: " \u2022 ",
    fullSeparator: "    ",
    ellipsis: "\u2026",
    styles: DefaultDarkStyles(),
    width: 0,
  }
}

/**
 * SetBindings sets the key bindings.
 */
export function SetBindings(m: HelpModel, bindings: Binding[][]): HelpModel {
  return { ...m, bindings }
}

/**
 * ToggleShowAll toggles between short and full help.
 */
export function ToggleShowAll(m: HelpModel): HelpModel {
  return { ...m, showAll: !m.showAll }
}

/**
 * SetWidth sets the maximum width for the help view.
 */
export function SetWidth(m: HelpModel, w: number): HelpModel {
  return { ...m, width: w }
}

/**
 * Width returns the maximum width for the help view.
 */
export function Width(m: HelpModel): number {
  return m.width
}

function shouldAddItem(m: HelpModel, totalWidth: number, itemWidth: number): { tail: string; ok: boolean } {
  if (m.width > 0 && totalWidth + itemWidth > m.width) {
    const tail = " " + m.styles.ellipsis.render(m.ellipsis)
    if (totalWidth + getStringWidth(tail) < m.width) {
      return { tail, ok: false }
    }
  }
  return { tail: "", ok: true }
}

function getStringWidth(s: string): number {
  let w = 0
  let inEscape = false
  for (const ch of s) {
    if (ch === "\x1b") { inEscape = true; continue }
    if (inEscape) { if (ch === "m") inEscape = false; continue }
    w += 1
  }
  return w
}

/**
 * ViewShort renders the short help view.
 */
export function ViewShort(m: HelpModel): string {
  const allBindings: Binding[] = []
  for (const group of m.bindings) {
    for (const b of group) {
      allBindings.push(b)
    }
  }

  const separator = m.styles.shortSeparator.inline(true).render(m.shortSeparator)
  const sepW = getStringWidth(separator)
  let totalWidth = 0
  let result = ""

  for (const b of allBindings) {
    if (!Enabled(b)) continue

    const h = b.Help()
    const str = (totalWidth > 0 ? separator : "") +
      m.styles.shortKey.inline(true).render(h.key) + " " +
      m.styles.shortDesc.inline(true).render(h.desc)
    const w = getStringWidth(str)

    const { tail, ok } = shouldAddItem(m, totalWidth, w)
    if (!ok) {
      if (tail) result += tail
      break
    }

    totalWidth += (totalWidth > 0 ? sepW : 0) + w
    result += str
  }

  return result
}

/**
 * FullHelpView renders help columns from a slice of key binding slices.
 */
export function ViewFull(m: HelpModel): string {
  if (m.bindings.length === 0) return ""

  const separator = m.styles.fullSeparator.inline(true).render(m.fullSeparator)
  const sepW = getStringWidth(separator)
  const columns: string[] = []
  let totalWidth = 0

  for (let i = 0; i < m.bindings.length; i++) {
    const group = m.bindings[i]!
    if (!shouldRenderColumn(group)) continue

    const sep = totalWidth > 0 ? separator : ""
    const enabledBindings = group.filter((b) => Enabled(b))
    if (enabledBindings.length === 0) continue

    const keys = enabledBindings.map((b) => b.Help().key).join("\n")
    const descs = enabledBindings.map((b) => b.Help().desc).join("\n")
    const col = sep +
      m.styles.fullKey.render(keys) + " " +
      m.styles.fullDesc.render(descs)
    const w = getStringWidth(col)

    const { tail, ok } = shouldAddItem(m, totalWidth, w)
    if (!ok) {
      if (tail) columns.push(tail)
      break
    }

    totalWidth += (totalWidth > 0 ? sepW : 0) + w
    columns.push(col)
  }

  return columns.join("")
}

function shouldRenderColumn(group: Binding[]): boolean {
  for (const b of group) {
    if (Enabled(b)) return true
  }
  return false
}

/**
 * View renders the help view.
 */
export function View(m: HelpModel): string {
  return m.showAll ? ViewFull(m) : ViewShort(m)
}

/**
 * Update helps satisfy the Bubble Tea Model interface. It's a no-op.
 */
export function Update(m: HelpModel, msg: any): [HelpModel, null] {
  return [m, null]
}
