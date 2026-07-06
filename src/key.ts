// key.ts | key binding system (bubbles port)

import type { KeyMsg } from "cinnamon-bun"

/**
 * Help is help information for a given keybinding.
 */
export interface Help {
  key: string
  desc: string
}

/**
 * BindingConfig is the config object for NewBinding.
 */
export interface BindingConfig {
  keys?: string[]
  help?: string
  disabled?: boolean
}

/**
 * Binding describes a set of keybindings and, optionally, their associated help text.
 */
export interface Binding {
  keys: string[]
  help: Help
  disabled: boolean
  SetKeys(...keys: string[]): void
  Keys(): string[]
  SetHelp(key: string, desc: string): void
  Help(): Help
  Enabled(): boolean
  SetEnabled(v: boolean): void
  Unbind(): void
}

/**
 * NewBinding returns a new keybinding from a config object.
 */
export function NewBinding(config: BindingConfig): Binding {
  const b: Binding = {
    keys: config.keys ?? [],
    help: typeof config.help === "string" ? { key: config.help, desc: "" } : { key: "", desc: "" },
    disabled: config.disabled ?? false,
    SetKeys(...keys: string[]) { this.keys = keys },
    Keys() { return this.keys },
    SetHelp(key: string, desc: string) { this.help = { key, desc } },
    Help() { return this.help },
    Enabled() { return !this.disabled && this.keys.length > 0 },
    SetEnabled(v: boolean) { this.disabled = !v },
    Unbind() { this.keys = []; this.help = { key: "", desc: "" } },
  }
  return b
}

/**
 * SetEnabled enables or disables a binding.
 */
export function SetEnabled(b: Binding, enabled: boolean): void {
  b.SetEnabled(enabled)
}

/**
 * Enabled returns whether a binding is enabled.
 */
export function Enabled(b: Binding): boolean {
  return b.Enabled()
}

/**
 * Keys returns the keys for a binding.
 */
export function Keys(b: Binding): string[] {
  return b.Keys()
}

/**
 * Help returns the Help information for the keybinding.
 */
export function GetHelpBinding(b: Binding): Help {
  return b.Help()
}

/**
 * Matches checks if a key message matches a binding.
 */
export function Matches(b: Binding, msg: KeyMsg): boolean {
  if (!b.Enabled()) return false
  const key = msg.key()
  const parts: string[] = []
  if (key.ctrl) parts.push("ctrl")
  if (key.alt) parts.push("alt")
  if (key.meta) parts.push("meta")
  parts.push(key.name)
  const keyStr = parts.join("+")
  for (const v of b.Keys()) {
    if (keyStr === v || key.name === v) return true
  }
  return false
}

/**
 * MatchesMulti checks if a key message matches any of the given bindings.
 */
export function MatchesMulti(msg: KeyMsg, ...bindings: Binding[]): boolean {
  for (const b of bindings) {
    if (Matches(b, msg)) return true
  }
  return false
}

/**
 * KeyMap is a collection of key bindings.
 */
export type KeyMap = Record<string, Binding>

/**
 * GetHelp returns help text for all enabled bindings in a key map.
 */
export function GetHelp(km: KeyMap): Help[] {
  return Object.values(km)
    .filter((b) => Enabled(b))
    .map((b) => b.Help())
}
