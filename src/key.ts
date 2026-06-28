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
 * BindingOpt is an initialization option for a keybinding.
 */
export type BindingOpt = (b: Binding) => void

/**
 * LegacyBindingConfig is the old-style config object for NewBinding.
 */
export interface LegacyBindingConfig {
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

function createBinding(opts: BindingOpt[]): Binding {
  const b: Binding = {
    keys: [],
    help: { key: "", desc: "" },
    disabled: false,
    SetKeys(...keys: string[]) { this.keys = keys },
    Keys() { return this.keys },
    SetHelp(key: string, desc: string) { this.help = { key, desc } },
    Help() { return this.help },
    Enabled() { return !this.disabled && this.keys.length > 0 },
    SetEnabled(v: boolean) { this.disabled = !v },
    Unbind() { this.keys = []; this.help = { key: "", desc: "" } },
  }
  for (const opt of opts) {
    opt(b)
  }
  return b
}

/**
 * NewBinding returns a new keybinding from BindingOpt options.
 */
export function NewBinding(...opts: BindingOpt[]): Binding
/**
 * NewBinding returns a new keybinding from a legacy config object.
 */
export function NewBinding(config: LegacyBindingConfig): Binding
export function NewBinding(...opts: any[]): Binding {
  if (opts.length === 1 && typeof opts[0] === "object" && opts[0] !== null && typeof opts[0] !== "function" && !opts[0].SetKeys) {
    const config = opts[0] as LegacyBindingConfig
    const legacyOpts: BindingOpt[] = []
    if (config.keys != null) legacyOpts.push(WithKeys(...config.keys))
    if (typeof config.help === "string") legacyOpts.push(WithHelp(config.help, ""))
    if (config.disabled) legacyOpts.push(WithDisabled())
    return createBinding(legacyOpts)
  }
  return createBinding(opts as BindingOpt[])
}

/**
 * WithKeys initializes a keybinding with the given keystrokes.
 */
export function WithKeys(...keys: string[]): BindingOpt {
  return (b: Binding) => { b.keys = keys }
}

/**
 * WithHelp initializes a keybinding with the given help text.
 */
export function WithHelp(key: string, desc: string): BindingOpt {
  return (b: Binding) => { b.help = { key, desc } }
}

/**
 * WithDisabled initializes a disabled keybinding.
 */
export function WithDisabled(): BindingOpt {
  return (b: Binding) => { b.disabled = true }
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
  const parts: string[] = []
  if (msg.ctrl) parts.push("ctrl")
  if (msg.alt) parts.push("alt")
  if (msg.meta) parts.push("meta")
  parts.push(msg.name)
  const keyStr = parts.join("+")
  for (const v of b.Keys()) {
    if (keyStr === v || msg.name === v) return true
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
