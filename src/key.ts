// key.ts | key binding system (bubbles port)

import type { KeyMsg } from "cinnamon-bun"

/**
 * Binding represents a key binding.
 */
export interface Binding {
  keys: string[]
  help: string
  disabled: boolean
}

/**
 * Create a new key binding.
 */
export function NewBinding(config: {
  keys?: string[]
  help?: string
  disabled?: boolean
}): Binding {
  return {
    keys: config.keys ?? [],
    help: config.help ?? "",
    disabled: config.disabled ?? false,
  }
}

/**
 * SetEnabled enables or disables a binding.
 */
export function SetEnabled(b: Binding, enabled: boolean): Binding {
  return { ...b, disabled: !enabled }
}

/**
 * Enabled returns whether a binding is enabled.
 */
export function Enabled(b: Binding): boolean {
  return !b.disabled
}

/**
 * Keys returns the keys for a binding.
 */
export function Keys(b: Binding): string[] {
  return b.keys
}

/**
 * Help returns the help text for a binding.
 */
export function Help(b: Binding): string {
  return b.help
}

/**
 * Matches checks if a key message matches a binding.
 */
export function Matches(b: Binding, msg: KeyMsg): boolean {
  if (b.disabled) return false

  const keyName = msg.name
  const keyStr = msg.ctrl ? `ctrl+${keyName}` : keyName

  return b.keys.some((k) => k === keyStr || k === keyName)
}

/**
 * KeyMap is a collection of key bindings.
 */
export type KeyMap = Record<string, Binding>

/**
 * GetHelp returns help text for all enabled bindings in a key map.
 */
export function GetHelp(km: KeyMap): string[] {
  return Object.values(km)
    .filter((b) => Enabled(b))
    .map((b) => `${b.keys[0]}: ${b.help}`)
}
