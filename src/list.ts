// list.ts | list component (bubbles port)

import type { Model, Msg, Cmd } from "cinnamon-bun"
import { Style } from "caramel"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"
import { type SpinnerModel, Spinner as NewSpinner, Tick as SpinnerTick, SpinCmd, View as SpinnerView } from "./spinner"
import { type TextInputModel, New as TextInputNew, SetValue as TextInputSetValue, Focus as TextInputFocus, Blur as TextInputBlur, Reset as TextInputReset, CursorEnd as TextInputCursorEnd, Update as TextInputUpdate, View as TextInputView, Value as TextInputValue, SetWidth as TextInputSetWidth } from "./textinput"

declare const setTimeout: any

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
 * Rank defines a rank for a given item.
 */
export interface Rank {
  index: number
  matchedIndexes: number[]
}

/**
 * FilterFunc takes a term and a list of strings to search through.
 * It should return a sorted list of ranks.
 */
export type FilterFunc = (term: string, targets: string[]) => Rank[]

/**
 * DefaultFilter uses fuzzy matching to filter items.
 */
export function DefaultFilter(term: string, targets: string[]): Rank[] {
  const results: Rank[] = []
  const lowerTerm = term.toLowerCase()

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!.toLowerCase()
    if (target.includes(lowerTerm)) {
      const matchedIndexes: number[] = []
      let searchIndex = 0
      for (const char of lowerTerm) {
        const idx = target.indexOf(char, searchIndex)
        if (idx >= 0) {
          matchedIndexes.push(idx)
          searchIndex = idx + 1
        }
      }
      results.push({ index: i, matchedIndexes })
    }
  }

  return results
}

/**
 * UnsortedFilter filters items without sorting by match quality.
 */
export function UnsortedFilter(term: string, targets: string[]): Rank[] {
  return DefaultFilter(term, targets)
}

/**
 * FilterMatchesMsg contains data about items matched during filtering.
 */
export interface FilterMatchItem {
  index: number
  item: Item
  matches: number[]
}

export type FilterMatchesMsg = FilterMatchItem[]

type statusMessageTimeoutMsg = { type: "statusMessageTimeout" }

/**
 * Styles contains style definitions for this list component.
 */
export interface Styles {
  titleBar: Style
  title: Style
  spinner: Style
  defaultFilterCharacterMatch: Style
  statusBar: Style
  statusEmpty: Style
  statusBarActiveFilter: Style
  statusBarFilterCount: Style
  noItems: Style
  paginationStyle: Style
  helpStyle: Style
  activePaginationDot: Style
  inactivePaginationDot: Style
  arabicPagination: Style
  dividerDot: Style
}

/**
 * DefaultStyles returns a set of default style definitions for this list component.
 */
export function DefaultStyles(isDark: boolean): Styles {
  const verySubduedColor = isDark ? "#3C3C3C" : "#DDDADA"
  const subduedColor = isDark ? "#5C5C5C" : "#9B9B9B"
  const spinnerColor = isDark ? "#747373" : "#8E8E8E"
  const statusBarColor = isDark ? "#777777" : "#A49FA5"
  const activeFilterColor = isDark ? "#dddddd" : "#1a1a1a"
  const noItemsColor = isDark ? "#626262" : "#909090"

  return {
    titleBar: new Style().padding(0, 0, 1, 2),
    title: new Style().background("62").foreground("230").padding(0, 1),
    spinner: new Style().foreground(spinnerColor),
    defaultFilterCharacterMatch: new Style().underline(true),
    statusBar: new Style().foreground(statusBarColor).padding(0, 0, 1, 2),
    statusEmpty: new Style().foreground(subduedColor),
    statusBarActiveFilter: new Style().foreground(activeFilterColor),
    statusBarFilterCount: new Style().foreground(verySubduedColor),
    noItems: new Style().foreground(noItemsColor),
    paginationStyle: new Style().paddingLeft(2),
    helpStyle: new Style().padding(1, 0, 0, 2),
    activePaginationDot: new Style().foreground(isDark ? "#979797" : "#847A85"),
    inactivePaginationDot: new Style().foreground(verySubduedColor),
    arabicPagination: new Style().foreground(subduedColor),
    dividerDot: new Style().foreground(verySubduedColor),
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
  ForceQuit: Binding
}

/**
 * DefaultListKeyMap returns the default key bindings.
 */
export function DefaultListKeyMap(): ListKeyMap {
  return {
    CursorUp: NewBinding(
      (b) => { b.keys = ["up", "k"] },
      (b) => { b.help = { key: "\u2191/k", desc: "up" } },
    ),
    CursorDown: NewBinding(
      (b) => { b.keys = ["down", "j"] },
      (b) => { b.help = { key: "\u2193/j", desc: "down" } },
    ),
    NextPage: NewBinding(
      (b) => { b.keys = ["right", "l", "pgdown", "f", "d"] },
      (b) => { b.help = { key: "\u2192/l/pgdn", desc: "next page" } },
    ),
    PrevPage: NewBinding(
      (b) => { b.keys = ["left", "h", "pgup", "b", "u"] },
      (b) => { b.help = { key: "\u2190/h/pgup", desc: "prev page" } },
    ),
    GoToStart: NewBinding(
      (b) => { b.keys = ["home", "g"] },
      (b) => { b.help = { key: "g/home", desc: "go to start" } },
    ),
    GoToEnd: NewBinding(
      (b) => { b.keys = ["end", "G"] },
      (b) => { b.help = { key: "G/end", desc: "go to end" } },
    ),
    Filter: NewBinding(
      (b) => { b.keys = ["/"] },
      (b) => { b.help = { key: "/", desc: "filter" } },
    ),
    ClearFilter: NewBinding(
      (b) => { b.keys = ["esc"] },
      (b) => { b.help = { key: "esc", desc: "clear filter" } },
    ),
    CancelWhileFiltering: NewBinding(
      (b) => { b.keys = ["esc"] },
      (b) => { b.help = { key: "esc", desc: "cancel" } },
    ),
    AcceptWhileFiltering: NewBinding(
      (b) => { b.keys = ["enter", "tab", "shift+tab", "ctrl+k", "up", "ctrl+j", "down"] },
      (b) => { b.help = { key: "enter", desc: "apply filter" } },
    ),
    ShowFullHelp: NewBinding(
      (b) => { b.keys = ["?"] },
      (b) => { b.help = { key: "?", desc: "more" } },
    ),
    CloseFullHelp: NewBinding(
      (b) => { b.keys = ["?"] },
      (b) => { b.help = { key: "?", desc: "close help" } },
    ),
    Quit: NewBinding(
      (b) => { b.keys = ["q", "esc"] },
      (b) => { b.help = { key: "q", desc: "quit" } },
    ),
    ForceQuit: NewBinding(
      (b) => { b.keys = ["ctrl+c"] },
    ),
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
  filterInput: TextInputModel
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
  statusMessageTimer: any
  disableQuitKeybindings: boolean
  spinner: SpinnerModel
  showSpinner: boolean
  styles: Styles
  filter: FilterFunc
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
  const styles = DefaultStyles(true)
  const sp = NewSpinner("line")
  sp.style = styles.spinner

  const filterInput = TextInputNew()
  filterInput.prompt = "Filter: "
  filterInput.charLimit = 64
  const [focusedFilterInput] = TextInputFocus(filterInput)

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
    filterInput: focusedFilterInput,
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
    statusMessageTimer: null,
    disableQuitKeybindings: false,
    spinner: sp,
    showSpinner: false,
    styles,
    filter: DefaultFilter,
  }
}

/**
 * SetItems sets the list items.
 */
export function SetItems(m: ListModel, items: Item[]): ListModel {
  const newM = { ...m, items, filteredItems: items, cursor: 0, offset: 0 }
  if (m.filterState !== "unfiltered") {
    newM.filteredItems = []
  }
  return newM
}

/**
 * Select selects the given index of the list.
 */
export function Select(m: ListModel, index: number): ListModel {
  const perPage = Math.max(1, Math.floor((m.height - 2) / (m.delegate.Height() + m.delegate.Spacing())))
  return {
    ...m,
    cursor: index % perPage,
    offset: Math.floor(index / perPage) * perPage,
  }
}

/**
 * ResetSelected resets the selected item to the first item.
 */
export function ResetSelected(m: ListModel): ListModel {
  return { ...m, cursor: 0, offset: 0 }
}

/**
 * SetItem replaces an item at the given index.
 */
export function SetItem(m: ListModel, index: number, item: Item): ListModel {
  const newItems = [...m.items]
  newItems[index] = item
  return { ...m, items: newItems }
}

/**
 * InsertItem inserts an item at the given index.
 */
export function InsertItem(m: ListModel, index: number, item: Item): ListModel {
  const newItems = [...m.items]
  const clampedIndex = Math.max(0, Math.min(index, newItems.length))
  newItems.splice(clampedIndex, 0, item)
  return { ...m, items: newItems }
}

/**
 * RemoveItem removes an item at the given index.
 */
export function RemoveItem(m: ListModel, index: number): ListModel {
  const newItems = [...m.items]
  if (index >= 0 && index < newItems.length) {
    newItems.splice(index, 1)
  }
  return { ...m, items: newItems, cursor: Math.min(m.cursor, Math.max(0, newItems.length - 1)) }
}

/**
 * SetSpinner allows setting the spinner type.
 */
export function SetSpinner(m: ListModel, type: string): ListModel {
  const sp = NewSpinner(type as any)
  sp.style = m.styles.spinner
  return { ...m, spinner: sp }
}

/**
 * ToggleSpinner toggles the spinner.
 */
export function ToggleSpinner(m: ListModel): [ListModel, Cmd] {
  if (!m.showSpinner) {
    return StartSpinner(m)
  }
  StopSpinner(m)
  return [{ ...m, showSpinner: false }, null]
}

/**
 * StartSpinner starts the spinner. Returns a command.
 */
export function StartSpinner(m: ListModel): [ListModel, Cmd] {
  return [{ ...m, showSpinner: true }, SpinCmd(m.spinner)]
}

/**
 * StopSpinner stops the spinner.
 */
export function StopSpinner(m: ListModel): ListModel {
  return { ...m, showSpinner: false }
}

/**
 * DisableQuitKeybindings disables the quit and force quit keybindings.
 */
export function DisableQuitKeybindings(m: ListModel): ListModel {
  m.keyMap.Quit.SetEnabled(false)
  m.keyMap.ForceQuit.SetEnabled(false)
  return { ...m, disableQuitKeybindings: true }
}

/**
 * SetFilterText explicitly sets the filter text.
 */
export function SetFilterText(m: ListModel, filter: string): ListModel {
  const targets = m.items.map((item) => item.filterValue())
  const ranks = m.filter(filter, targets)
  const filteredItems = ranks.map((r) => m.items[r.index]!)
  let filterInput = TextInputSetValue(m.filterInput, filter)
  filterInput = TextInputCursorEnd(filterInput)
  return { ...m, filterState: "filtered", filterInput, filteredItems }
}

/**
 * SetFilterState allows setting the filtering state manually.
 */
export function SetFilterState(m: ListModel, state: FilterState): ListModel {
  return { ...m, filterState: state }
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
    const ch = getContentHeight(m)
    const newOffset = newCursor >= m.offset + ch ? newCursor - ch + 1 : m.offset
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
  const ch = getContentHeight(m)
  const newCursor = Math.max(0, m.cursor - ch)
  return { ...m, cursor: newCursor, offset: Math.max(0, newCursor - ch + 1) }
}

/**
 * NextPage goes to the next page.
 */
export function NextPage(m: ListModel): ListModel {
  const items = VisibleItems(m)
  const ch = getContentHeight(m)
  const newCursor = Math.min(items.length - 1, m.cursor + ch)
  return { ...m, cursor: newCursor, offset: Math.max(0, newCursor - ch + 1) }
}

/**
 * FilterState returns the current filter state.
 */
export function FilterStateFn(m: ListModel): FilterState {
  return m.filterState
}

/**
 * FilterValue returns the current filter value.
 */
export function FilterValue(m: ListModel): string {
  return TextInputValue(m.filterInput)
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
 * SetFilterFunc sets a custom filter function.
 */
export function SetFilterFunc(m: ListModel, fn: FilterFunc): ListModel {
  return { ...m, filter: fn }
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
  const newFilterInput = TextInputSetWidth(m.filterInput, width)
  return { ...m, width, filterInput: newFilterInput }
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
  const newFilterInput = TextInputSetWidth(m.filterInput, width)
  return { ...m, width, height, filterInput: newFilterInput }
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
  const resetFilterInput = TextInputReset(m.filterInput)
  return {
    ...m,
    filterState: "unfiltered",
    filterInput: resetFilterInput,
    filteredItems: m.items,
    cursor: 0,
    offset: 0,
  }
}

function titleView(m: ListModel): string {
  if (m.showFilter && m.filterState === "filtering") {
    return TextInputView(m.filterInput)
  }
  if (m.showTitle) {
    let view = m.styles.title.render(m.title)
    if (m.filterState !== "filtering" && m.statusMessage) {
      view += "  " + m.statusMessage
    }
    return m.styles.titleBar.render(view)
  }
  return ""
}

function statusView(m: ListModel): string {
  const totalItems = m.items.length
  const visibleItems = VisibleItems(m).length
  const itemName = visibleItems === 1 ? m.itemNameSingular : m.itemNamePlural
  let itemsDisplay = `${visibleItems} ${itemName}`
  let status = ""

  if (m.filterState === "filtering") {
    if (visibleItems === 0) {
      status = m.styles.statusEmpty.render("Nothing matched")
    } else {
      status = itemsDisplay
    }
  } else if (m.items.length === 0) {
    status = m.styles.statusEmpty.render("No " + m.itemNamePlural)
  } else {
    if (m.filterState === "filtered") {
      const f = TextInputValue(m.filterInput).slice(0, 10)
      status += `"${f}" `
    }
    status += itemsDisplay
  }

  const numFiltered = totalItems - visibleItems
  if (numFiltered > 0) {
    status += m.styles.dividerDot.render(" \u2022 ") +
      m.styles.statusBarFilterCount.render(`${numFiltered} filtered`)
  }

  return m.styles.statusBar.render(status)
}

function paginationView(m: ListModel): string {
  const items = VisibleItems(m)
  if (items.length === 0) return ""
  const perPage = Math.max(1, getContentHeight(m))
  return m.styles.paginationStyle.render(`Page ${Math.floor(m.cursor / perPage) + 1}`)
}

function helpView(m: ListModel): string {
  const bindings = [
    m.keyMap.CursorUp,
    m.keyMap.CursorDown,
    m.keyMap.Filter,
    m.keyMap.Quit,
  ]
  const helpParts = bindings
    .filter((b) => b.Enabled())
    .map((b) => {
      const h = b.Help()
      return `${h.key}: ${h.desc}`
    })
  return m.styles.helpStyle.render(helpParts.join(" \u2022 "))
}

/**
 * Update handles keyboard input.
 */
export function Update(m: ListModel, msg: Msg): [ListModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  if (msg.type === "spinnerTick") {
    const [newSpinner, cmd] = SpinnerTick(m.spinner)
    const newM = { ...m, spinner: newSpinner }
    return [newM, m.showSpinner ? cmd : null]
  }

  if (msg.type === "statusMessageTimeout") {
    return [{ ...m, statusMessage: "" }, null]
  }

  if (msg.type !== "key") return [m, null]

  const key = msg as any

  if (Matches(m.keyMap.ForceQuit as any, key)) {
    return [m, () => ({ type: "quit" } as any)]
  }

  if (m.filterState === "filtering") {
    if (Matches(m.keyMap.CancelWhileFiltering as any, key)) {
      return [ResetFilter(m), null]
    }
    if (Matches(m.keyMap.AcceptWhileFiltering as any, key)) {
      const blurredInput = TextInputBlur(m.filterInput)
      if (m.filteredItems.length === 0) {
        const resetInput = TextInputReset(blurredInput)
        return [{ ...m, filterState: "unfiltered", filterInput: resetInput, cursor: 0 }, null]
      }
      const newCursor = Math.min(m.cursor, m.filteredItems.length - 1)
      return [{ ...m, filterState: "filtered", filterInput: blurredInput, cursor: newCursor }, null]
    }
    const [newFilterInput, inputCmd] = TextInputUpdate(m.filterInput, msg)
    const newValue = TextInputValue(newFilterInput)
    const oldValue = TextInputValue(m.filterInput)
    if (newValue !== oldValue) {
      const targets = m.items.map((item) => item.filterValue())
      const ranks = m.filter(newValue, targets)
      const filteredItems = ranks.map((r) => m.items[r.index]!)
      const newCursor = Math.min(m.cursor, Math.max(0, filteredItems.length - 1))
      return [{ ...m, filterInput: newFilterInput, filteredItems, cursor: newCursor }, inputCmd]
    }
    return [{ ...m, filterInput: newFilterInput }, inputCmd]
  }

  if (m.filterState === "filtered" && Matches(m.keyMap.ClearFilter as any, key)) {
    return [ResetFilter(m), null]
  }
  if (Matches(m.keyMap.Quit as any, key)) {
    return [m, () => ({ type: "quit" } as any)]
  }
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
    const resetFilterInput = TextInputReset(m.filterInput)
    const [focusedInput] = TextInputFocus(resetFilterInput)
    return [{ ...m, filterState: "filtering", filterInput: focusedInput }, null]
  }
  if (Matches(m.keyMap.ShowFullHelp as any, key) || Matches(m.keyMap.CloseFullHelp as any, key)) {
    // Toggle help visibility - for now just a no-op
    return [m, null]
  }

  return [m, null]
}

function stringHeight(str: string): number {
  if (str === "") return 0
  return str.split("\n").length
}

function getContentHeight(m: ListModel): number {
  let h = m.height
  if (m.showTitle || (m.showFilter && m.filteringEnabled)) {
    h -= stringHeight(titleView(m))
  }
  if (m.showStatusBar) {
    h -= stringHeight(statusView(m))
  }
  if (m.showPagination) {
    const items = VisibleItems(m)
    if (items.length > 0) h -= 1
  }
  if (m.showHelp) {
    h -= stringHeight(helpView(m))
  }
  return Math.max(0, h)
}

/**
 * View renders the list.
 */
export function View(m: ListModel): string {
  const sections: string[] = []

  if (m.showTitle || (m.showFilter && m.filteringEnabled)) {
    sections.push(titleView(m))
  }

  if (m.showStatusBar) {
    sections.push(statusView(m))
  }

  const contentHeight = getContentHeight(m)
  const items = VisibleItems(m)
  const contentLines: string[] = []

  for (let i = 0; i < contentHeight; i++) {
    const itemIndex = m.offset + i
    if (itemIndex < items.length) {
      const item = items[itemIndex]!
      let line = ""
      m.delegate.Render((s) => (line += s), m, itemIndex, item)
      contentLines.push(line)
    } else {
      contentLines.push("")
    }
  }

  sections.push(contentLines.join("\n"))

  if (m.showPagination) {
    const pagination = paginationView(m)
    if (pagination) sections.push(pagination)
  }

  if (m.showHelp) {
    sections.push(helpView(m))
  }

  return sections.join("\n")
}
