// help.ts | help bar component (bubbles port)

import { Style } from "caramel"
import { type Binding, Enabled, Keys, Help as BindingHelp } from "./key"

/**
 * HelpModel is the state for the help component.
 */
export interface HelpModel {
  bindings: Binding[][]
  showAll: boolean
  styles: {
    shortKey: Style
    shortDesc: Style
    fullKey: Style
    fullDesc: Style
    separator: Style
  }
}

/**
 * Help creates a new help model.
 */
export function Help(): HelpModel {
  return {
    bindings: [],
    showAll: false,
    styles: {
      shortKey: new Style().bold(true).foreground("#7f00ff"),
      shortDesc: new Style().foreground("#AAAAAA"),
      fullKey: new Style().bold(true).foreground("#7f00ff"),
      fullDesc: new Style().foreground("#AAAAAA"),
      separator: new Style().foreground("#666666"),
    },
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
 * ViewShort renders the short help view.
 */
export function ViewShort(m: HelpModel): string {
  const items: string[] = []
  for (const group of m.bindings) {
    for (const b of group) {
      if (Enabled(b)) {
        items.push(
          m.styles.shortKey.render(Keys(b)[0]) +
          " " +
          m.styles.shortDesc.render(BindingHelp(b))
        )
      }
    }
  }
  return items.join(m.styles.separator.render(" · "))
}

/**
 * ViewFull renders the full help view.
 */
export function ViewFull(m: HelpModel): string {
  const items: string[] = []
  for (const group of m.bindings) {
    for (const b of group) {
      if (Enabled(b)) {
        items.push(
          m.styles.fullKey.render(Keys(b)[0]) +
          " " +
          m.styles.fullDesc.render(BindingHelp(b))
        )
      }
    }
  }
  return items.join(m.styles.separator.render(" · "))
}

/**
 * View renders the help view.
 */
export function View(m: HelpModel): string {
  return m.showAll ? ViewFull(m) : ViewShort(m)
}
