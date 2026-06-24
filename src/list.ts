// list.ts | list component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

/**
 * Item is an interface for list items.
 */
export interface Item {
  FilterValue(): string
}

/**
 * DefaultItem is a simple string item.
 */
export class DefaultItem implements Item {
  constructor(
    public title: string,
    public description: string = "",
  ) {}

  FilterValue(): string {
    return this.title
  }
}

/**
 * ItemDelegate renders list items.
 */
export interface ItemDelegate {
  Height(): number
  Spacing(): number
  Render(w: (s: string) => void, m: ListModel, index: number, item: Item): void
  Update(msg: Msg, m: ListModel): Cmd
}

/**
 * DefaultDelegate renders items with title and description.
 */
export class DefaultDelegate implements ItemDelegate {
  private styles: {
    normal: Style
    selected: Style
    title: Style
    desc: Style
    dimmed: Style
  }

  constructor(dark: boolean = true) {
    this.styles = {
      normal: Style().foreground(dark ? "#AAAAAA" : "#555555"),
      selected: Style().foreground(dark ? "#FFFFFF" : "#000000"),
      title: Style().bold(true),
      desc: Style().foreground(dark ? "#666666" : "#999999"),
      dimmed: Style().dim(true).foreground(dark ? "#444444" : "#BBBBBB"),
    }
  }

  Height(): number {
    return 1
  }

  Spacing(): number {
    return 0
  }

  Render(w: (s: string) => void, m: ListModel, index: number, item: Item): void {
    const isSelected = index === m.cursor

    if (item instanceof DefaultItem) {
      const title = this.styles.title.render(item.title)
      const desc = item.description
        ? this.styles.desc.render(` ${item.description}`)
        : ""

      if (isSelected) {
        w(this.styles.selected.render(`▸ ${title}${desc}`))
      } else {
        w(this.styles.normal.render(`  ${title}${desc}`))
      }
    } else {
      const text = item.FilterValue()
      if (isSelected) {
        w(this.styles.selected.render(`▸ ${text}`))
      } else {
        w(this.styles.normal.render(`  ${text}`))
      }
    }
  }

  Update(msg: Msg, m: ListModel): Cmd {
    return null
  }
}

/**
 * ListKeyMap is the key bindings for the list.
 */
export interface ListKeyMap {
  CursorUp: Binding
  CursorDown: Binding
  NextPage: Binding
  PrevPage: Binding
  GoToStart: Binding
  GoToEnd: Binding
  Filter: Binding
  ClearFilter: Binding
  CancelWhileFiltering: Binding
  AcceptWhileFiltering: Binding
  ShowFullHelp: Binding
  CloseFullHelp: Binding
  Quit: Binding
}

/**
 * DefaultListKeyMap returns the default key bindings.
 */
export function DefaultListKeyMap(): ListKeyMap {
  return {
    CursorUp: NewBinding({ keys: ["up", "k"], help: "up" }),
    CursorDown: NewBinding({ keys: ["down", "j"], help: "down" }),
    NextPage: NewBinding({ keys: ["pgdown", "ctrl+f"], help: "next page" }),
    PrevPage: NewBinding({ keys: ["pgup", "ctrl+b"], help: "prev page" }),
    GoToStart: NewBinding({ keys: ["home", "g"], help: "go to start" }),
    GoToEnd: NewBinding({ keys: ["end", "G"], help: "go to end" }),
    Filter: NewBinding({ keys: ["/"], help: "filter" }),
    ClearFilter: NewBinding({ keys: ["esc"], help: "clear filter" }),
    CancelWhileFiltering: NewBinding({ keys: ["esc"], help: "cancel" }),
    AcceptWhileFiltering: NewBinding({ keys: ["enter"], help: "accept" }),
    ShowFullHelp: NewBinding({ keys: ["?"], help: "show full help" }),
    CloseFullHelp: NewBinding({ keys: ["?"], help: "close full help" }),
    Quit: NewBinding({ keys: ["q", "ctrl+c"], help: "quit" }),
  }
}

/**
 * ListModel is the state for the list.
 */
export interface ListModel {
  items: Item[]
  filteredItems: Item[]
  delegate: ItemDelegate
  cursor: number
  offset: number
  width: number
  height: number
  title: string
  filterState: "unfiltered" | "filtering" | "filtered"
  filterValue: string
  keyMap: ListKeyMap
  showTitle: boolean
  showFilter: boolean
  showStatusBar: boolean
  showPagination: boolean
  showHelp: boolean
  filteringEnabled: boolean
  infiniteScrolling: boolean
  itemNameSingular: string
  itemNamePlural: string
}

/**
 * List creates a new list model.
 */
export function List(
  items: Item[],
  delegate: ItemDelegate,
  width: number,
  height: number,
): ListModel {
  return {
    items,
    filteredItems: items,
    delegate,
    cursor: 0,
    offset: 0,
    width,
    height,
    title: "List",
    filterState: "unfiltered",
    filterValue: "",
    keyMap: DefaultListKeyMap(),
    showTitle: true,
    showFilter: true,
    showStatusBar: true,
    showPagination: true,
    showHelp: true,
    filteringEnabled: true,
    infiniteScrolling: false,
    itemNameSingular: "item",
    itemNamePlural: "items",
  }
}

/**
 * SetItems sets the list items.
 */
export function SetItems(m: ListModel, items: Item[]): ListModel {
  return { ...m, items, filteredItems: items, cursor: 0, offset: 0 }
}

/**
 * CursorUp moves the cursor up.
 */
export function CursorUp(m: ListModel): ListModel {
  if (m.cursor > 0) {
    return { ...m, cursor: m.cursor - 1 }
  }
  return m
}

/**
 * CursorDown moves the cursor down.
 */
export function CursorDown(m: ListModel): ListModel {
  if (m.cursor < m.filteredItems.length - 1) {
    return { ...m, cursor: m.cursor + 1 }
  }
  return m
}

/**
 * Index returns the current selected index.
 */
export function Index(m: ListModel): number {
  return m.cursor
}

/**
 * SelectedItem returns the currently selected item.
 */
export function SelectedItem(m: ListModel): Item | null {
  const items = m.filterState === "filtered" ? m.filteredItems : m.items
  if (m.cursor < 0 || m.cursor >= items.length) return null
  return items[m.cursor]!
}

/**
 * VisibleItems returns the visible items.
 */
export function VisibleItems(m: ListModel): Item[] {
  return m.filterState === "filtered" ? m.filteredItems : m.items
}

/**
 * Update handles keyboard input.
 */
export function Update(m: ListModel, msg: Msg): [ListModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]
  if (msg.type !== "key") return [m, null]

  const key = msg as any

  // Filtering mode
  if (m.filterState === "filtering") {
    if (Matches(m.keyMap.CancelWhileFiltering as any, key)) {
      return [{ ...m, filterState: "unfiltered", filterValue: "" }, null]
    }
    if (Matches(m.keyMap.AcceptWhileFiltering as any, key)) {
      if (m.filteredItems.length === 0) {
        return [{ ...m, filterState: "unfiltered", filterValue: "" }, null]
      }
      return [{ ...m, filterState: "filtered" }, null]
    }
    // Handle filter input
    if (key.name && key.name.length === 1 && !key.ctrl) {
      const newFilter = m.filterValue + key.name
      const filtered = m.items.filter((item) =>
        item.FilterValue().toLowerCase().includes(newFilter.toLowerCase())
      )
      return [{ ...m, filterValue: newFilter, filteredItems: filtered }, null]
    }
    return [m, null]
  }

  // Normal mode
  if (Matches(m.keyMap.CursorUp as any, key)) {
    return [CursorUp(m), null]
  }
  if (Matches(m.keyMap.CursorDown as any, key)) {
    return [CursorDown(m), null]
  }
  if (Matches(m.keyMap.GoToStart as any, key)) {
    return [{ ...m, cursor: 0 }, null]
  }
  if (Matches(m.keyMap.GoToEnd as any, key)) {
    const items = VisibleItems(m)
    return [{ ...m, cursor: items.length - 1 }, null]
  }
  if (Matches(m.keyMap.Filter as any, key) && m.filteringEnabled) {
    return [{ ...m, filterState: "filtering", filterValue: "" }, null]
  }
  if (Matches(m.keyMap.ClearFilter as any, key) && m.filterState === "filtered") {
    return [{ ...m, filterState: "unfiltered", filterValue: "", filteredItems: m.items }, null]
  }
  if (Matches(m.keyMap.Quit as any, key)) {
    return [m, () => ({ type: "quit" } as any)]
  }

  return [m, null]
}

/**
 * View renders the list.
 */
export function View(m: ListModel): string {
  const lines: string[] = []

  // Title
  if (m.showTitle) {
    lines.push(Style().bold(true).foreground("#7f00ff").render(m.title))
  }

  // Filter
  if (m.showFilter && m.filterState === "filtering") {
    lines.push(Style().dim(true).render(`Filter: ${m.filterValue}_`))
  }

  // Items
  const contentHeight = m.height - 2 // borders
  const items = VisibleItems(m)

  for (let i = 0; i < contentHeight; i++) {
    const itemIndex = m.offset + i
    if (itemIndex < items.length) {
      const item = items[itemIndex]!
      let line = ""
      m.delegate.Render((s) => (line += s), m, itemIndex, item)
      lines.push(line)
    } else {
      lines.push("")
    }
  }

  // Status bar
  if (m.showStatusBar) {
    const total = m.items.length
    const visible = items.length
    const itemName = visible === 1 ? m.itemNameSingular : m.itemNamePlural
    lines.push(Style().dim(true).render(`${visible} ${itemName}`))
  }

  // Help
  if (m.showHelp) {
    const help = [
      m.keyMap.CursorUp.help,
      m.keyMap.CursorDown.help,
      m.keyMap.Filter.help,
      m.keyMap.Quit.help,
    ].join(" · ")
    lines.push(Style().dim(true).render(help))
  }

  return lines.join("\n")
}
