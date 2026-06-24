// list.ts | list component (bubbles port) - COMPLETE

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

/**
 * Item is an interface for list items.
 */
export interface Item {
  filterValue(): string
}

/**
 * DefaultItem is a simple string item.
 */
export class DefaultItem implements Item {
  constructor(
    public title: string,
    public description: string = "",
  ) {}

  filterValue(): string {
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
      normal: new Style().foreground(dark ? "#AAAAAA" : "#555555"),
      selected: new Style().foreground(dark ? "#FFFFFF" : "#000000"),
      title: new Style().bold(true),
      desc: new Style().foreground(dark ? "#666666" : "#999999"),
      dimmed: new Style().dim(true).foreground(dark ? "#444444" : "#BBBBBB"),
    }
  }

  Height(): number { return 1 }
  Spacing(): number { return 0 }

  Render(w: (s: string) => void, m: ListModel, index: number, item: Item): void {
    const isSelected = index === m.cursor

    if (item instanceof DefaultItem) {
      const title = this.styles.title.render(item.title)
      const desc = item.description ? this.styles.desc.render(` ${item.description}`) : ""
      if (isSelected) {
        w(this.styles.selected.render(`▸ ${title}${desc}`))
      } else {
        w(this.styles.normal.render(`  ${title}${desc}`))
      }
    } else {
      const text = item.filterValue()
      if (isSelected) {
        w(this.styles.selected.render(`▸ ${text}`))
      } else {
        w(this.styles.normal.render(`  ${text}`))
      }
    }
  }

  Update(msg: Msg, m: ListModel): Cmd { return null }
}

/**
 * FilterFunc is a function that filters items.
 */
export type FilterFunc = (term: string, targets: string[]) => { index: number; matches: number[] }[]

/**
 * DefaultFilter uses fuzzy matching to filter items.
 */
export function DefaultFilter(term: string, targets: string[]): { index: number; matches: number[] }[] {
  const results: { index: number; matches: number[] }[] = []
  const lowerTerm = term.toLowerCase()

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!.toLowerCase()
    if (target.includes(lowerTerm)) {
      const matches: number[] = []
      let searchIndex = 0
      for (const char of lowerTerm) {
        const idx = target.indexOf(char, searchIndex)
        if (idx >= 0) {
          matches.push(idx)
          searchIndex = idx + 1
        }
      }
      results.push({ index: i, matches })
    }
  }

  return results
}

/**
 * UnsortedFilter filters items without sorting by match quality.
 */
export function UnsortedFilter(term: string, targets: string[]): { index: number; matches: number[] }[] {
  const results: { index: number; matches: number[] }[] = []
  const lowerTerm = term.toLowerCase()

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!.toLowerCase()
    if (target.includes(lowerTerm)) {
      const matches: number[] = []
      let searchIndex = 0
      for (const char of lowerTerm) {
        const idx = target.indexOf(char, searchIndex)
        if (idx >= 0) {
          matches.push(idx)
          searchIndex = idx + 1
        }
      }
      results.push({ index: i, matches })
    }
  }

  return results
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
 * FilterState represents the current filter state.
 */
export type FilterState = "unfiltered" | "filtering" | "filtered"

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
  filterState: FilterState
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
  statusMessage: string
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
    statusMessage: "",
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
    const newCursor = m.cursor - 1
    const newOffset = newCursor < m.offset ? newCursor : m.offset
    return { ...m, cursor: newCursor, offset: newOffset }
  }
  if (m.infiniteScrolling) {
    const last = m.filteredItems.length - 1
    return { ...m, cursor: last, offset: Math.max(0, last - m.height + 1) }
  }
  return m
}

/**
 * CursorDown moves the cursor down.
 */
export function CursorDown(m: ListModel): ListModel {
  if (m.cursor < m.filteredItems.length - 1) {
    const newCursor = m.cursor + 1
    const newOffset = newCursor >= m.offset + m.height ? newCursor - m.height + 1 : m.offset
    return { ...m, cursor: newCursor, offset: newOffset }
  }
  if (m.infiniteScrolling) {
    return { ...m, cursor: 0, offset: 0 }
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
 * GlobalIndex returns the index in the unfiltered list.
 */
export function GlobalIndex(m: ListModel): number {
  if (m.filterState !== "filtered") return m.cursor
  const item = m.filteredItems[m.cursor]
  if (!item) return m.cursor
  return m.items.indexOf(item)
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
 * Items returns all items.
 */
export function Items(m: ListModel): Item[] {
  return m.items
}

/**
 * GoToStart goes to the first item.
 */
export function GoToStart(m: ListModel): ListModel {
  return { ...m, cursor: 0 }
}

/**
 * GoToEnd goes to the last item.
 */
export function GoToEnd(m: ListModel): ListModel {
  const items = VisibleItems(m)
  return { ...m, cursor: items.length - 1 }
}

/**
 * PrevPage goes to the previous page.
 */
export function PrevPage(m: ListModel): ListModel {
  return { ...m, cursor: Math.max(0, m.cursor - m.height) }
}

/**
 * NextPage goes to the next page.
 */
export function NextPage(m: ListModel): ListModel {
  const items = VisibleItems(m)
  return { ...m, cursor: Math.min(items.length - 1, m.cursor + m.height) }
}

/**
 * FilterState returns the current filter state.
 */
export function FilterState(m: ListModel): FilterState {
  return m.filterState
}

/**
 * FilterValue returns the current filter value.
 */
export function FilterValue(m: ListModel): string {
  return m.filterValue
}

/**
 * SettingFilter returns whether the user is currently editing the filter.
 */
export function SettingFilter(m: ListModel): boolean {
  return m.filterState === "filtering"
}

/**
 * IsFiltered returns whether the list is filtered.
 */
export function IsFiltered(m: ListModel): boolean {
  return m.filterState === "filtered"
}

/**
 * SetFilteringEnabled enables or disables filtering.
 */
export function SetFilteringEnabled(m: ListModel, enabled: boolean): ListModel {
  return { ...m, filteringEnabled: enabled }
}

/**
 * SetShowTitle shows or hides the title.
 */
export function SetShowTitle(m: ListModel, show: boolean): ListModel {
  return { ...m, showTitle: show }
}

/**
 * SetShowFilter shows or hides the filter.
 */
export function SetShowFilter(m: ListModel, show: boolean): ListModel {
  return { ...m, showFilter: show }
}

/**
 * SetShowStatusBar shows or hides the status bar.
 */
export function SetShowStatusBar(m: ListModel, show: boolean): ListModel {
  return { ...m, showStatusBar: show }
}

/**
 * SetShowPagination shows or hides pagination.
 */
export function SetShowPagination(m: ListModel, show: boolean): ListModel {
  return { ...m, showPagination: show }
}

/**
 * SetShowHelp shows or hides help.
 */
export function SetShowHelp(m: ListModel, show: boolean): ListModel {
  return { ...m, showHelp: show }
}

/**
 * SetWidth sets the list width.
 */
export function SetWidth(m: ListModel, width: number): ListModel {
  return { ...m, width }
}

/**
 * SetHeight sets the list height.
 */
export function SetHeight(m: ListModel, height: number): ListModel {
  return { ...m, height }
}

/**
 * SetSize sets width and height.
 */
export function SetSize(m: ListModel, width: number, height: number): ListModel {
  return { ...m, width, height }
}

/**
 * NewStatusMessage sets a status message.
 */
export function NewStatusMessage(m: ListModel, message: string): ListModel {
  return { ...m, statusMessage: message }
}

/**
 * ResetFilter resets the filter.
 */
export function ResetFilter(m: ListModel): ListModel {
  return {
    ...m,
    filterState: "unfiltered",
    filterValue: "",
    filteredItems: m.items,
  }
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
    if (key.name && key.name.length === 1 && !key.ctrl) {
      const newFilter = m.filterValue + key.name
      const filtered = m.items.filter((item) =>
        item.filterValue().toLowerCase().includes(newFilter.toLowerCase()),
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
    return [GoToStart(m), null]
  }
  if (Matches(m.keyMap.GoToEnd as any, key)) {
    return [GoToEnd(m), null]
  }
  if (Matches(m.keyMap.Filter as any, key) && m.filteringEnabled) {
    return [{ ...m, filterState: "filtering", filterValue: "" }, null]
  }
  if (Matches(m.keyMap.ClearFilter as any, key) && m.filterState === "filtered") {
    return [ResetFilter(m), null]
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

  if (m.showTitle) {
    lines.push(new Style().bold(true).foreground("#7f00ff").render(m.title))
  }

  if (m.showFilter && m.filterState === "filtering") {
    lines.push(new Style().dim(true).render(`Filter: ${m.filterValue}_`))
  }

  const contentHeight = m.height - 2
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

  if (m.showStatusBar) {
    const total = m.items.length
    const visible = items.length
    const itemName = visible === 1 ? m.itemNameSingular : m.itemNamePlural
    lines.push(new Style().dim(true).render(`${visible} ${itemName}`))
  }

  if (m.showHelp) {
    const help = [
      m.keyMap.CursorUp.help,
      m.keyMap.CursorDown.help,
      m.keyMap.Filter.help,
      m.keyMap.Quit.help,
    ].join(" · ")
    lines.push(new Style().dim(true).render(help))
  }

  return lines.join("\n")
}
