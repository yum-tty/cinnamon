import type { Model, Msg, Cmd } from "cinnamon-bun"
import { NewStyle } from "caramel"
import { readdir, stat, readlink } from "node:fs/promises"
import { statSync } from "node:fs"
import { join, dirname } from "node:path"
import { type Binding, NewBinding, Matches, type KeyMap } from "./key"

let lastID = 0

function nextID(): number {
  return ++lastID
}

const marginBottom = 5
const fileSizeWidth = 7
const paddingLeft = 2

export interface FilePickerKeyMap {
  GoToTop: Binding
  GoToLast: Binding
  Down: Binding
  Up: Binding
  PageUp: Binding
  PageDown: Binding
  Back: Binding
  Open: Binding
  Select: Binding
}

export function DefaultKeyMap(): FilePickerKeyMap {
  return {
    GoToTop: NewBinding({ keys: ["g"], help: "first" }),
    GoToLast: NewBinding({ keys: ["G"], help: "last" }),
    Down: NewBinding({ keys: ["j", "down", "ctrl+n"], help: "down" }),
    Up: NewBinding({ keys: ["k", "up", "ctrl+p"], help: "up" }),
    PageUp: NewBinding({ keys: ["K", "pgup"], help: "page up" }),
    PageDown: NewBinding({ keys: ["J", "pgdown"], help: "page down" }),
    Back: NewBinding({ keys: ["h", "backspace", "left", "esc"], help: "back" }),
    Open: NewBinding({ keys: ["l", "right", "enter"], help: "open" }),
    Select: NewBinding({ keys: ["enter"], help: "select" }),
  }
}

export interface FilePickerStyles {
  disabledCursor: ReturnType<typeof NewStyle>
  cursor: ReturnType<typeof NewStyle>
  symlink: ReturnType<typeof NewStyle>
  directory: ReturnType<typeof NewStyle>
  file: ReturnType<typeof NewStyle>
  disabledFile: ReturnType<typeof NewStyle>
  permission: ReturnType<typeof NewStyle>
  selected: ReturnType<typeof NewStyle>
  disabledSelected: ReturnType<typeof NewStyle>
  fileSize: ReturnType<typeof NewStyle>
  emptyDirectory: ReturnType<typeof NewStyle>
}

export function DefaultStyles(): FilePickerStyles {
  return {
    disabledCursor: NewStyle().foreground("247"),
    cursor: NewStyle().foreground("212"),
    symlink: NewStyle().foreground("36"),
    directory: NewStyle().foreground("99"),
    file: NewStyle(),
    disabledFile: NewStyle().foreground("243"),
    disabledSelected: NewStyle().foreground("247"),
    permission: NewStyle().foreground("244"),
    selected: NewStyle().foreground("212").bold(true),
    fileSize: NewStyle().foreground("240").width(fileSizeWidth).alignHorizontal("right"),
    emptyDirectory: NewStyle().foreground("240").paddingLeft(paddingLeft).setString("Bummer. No Files Found."),
  }
}

export interface FileEntry {
  name: string
  isDir: boolean
  isFile: boolean
  isSymlink: boolean
  size: number
  mode: number
  symlinkTarget?: string
}

interface ReadDirMsg {
  type: "readDirMsg"
  id: number
  entries: FileEntry[]
}

interface ErrorMsg {
  type: "errorMsg"
  err: Error
}

interface Stack {
  push(value: number): void
  pop(): number
  length(): number
}

function newStack(): Stack {
  const slice: number[] = []
  return {
    push(i: number) {
      slice.push(i)
    },
    pop(): number {
      return slice.pop()!
    },
    length(): number {
      return slice.length
    },
  }
}

export interface FilePickerModel {
  id: number
  path: string
  currentDirectory: string
  allowedTypes: string[]
  files: FileEntry[]
  keyMap: FilePickerKeyMap
  showPermissions: boolean
  showSize: boolean
  showHidden: boolean
  dirAllowed: boolean
  fileAllowed: boolean
  fileSelected: string
  selected: number
  selectedStack: Stack
  minIdx: number
  maxIdx: number
  maxStack: Stack
  minStack: Stack
  height: number
  autoHeight: boolean
  cursor: string
  styles: FilePickerStyles
}

export function New(): FilePickerModel {
  return {
    id: nextID(),
    path: "",
    currentDirectory: ".",
    allowedTypes: [],
    files: [],
    keyMap: DefaultKeyMap(),
    showPermissions: true,
    showSize: true,
    showHidden: false,
    dirAllowed: false,
    fileAllowed: true,
    fileSelected: "",
    selected: 0,
    selectedStack: newStack(),
    minIdx: 0,
    maxIdx: 0,
    maxStack: newStack(),
    minStack: newStack(),
    height: 0,
    autoHeight: true,
    cursor: ">",
    styles: DefaultStyles(),
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0B"
  const units = ["B", "kB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  const formatted = val < 10 ? val.toFixed(1) : Math.round(val).toString()
  return formatted + units[i]
}

export function IsHidden(name: string): boolean {
  if (process.platform === "win32") {
    try {
      const { execSync } = require("child_process") as typeof import("child_process")
      const output = execSync(`attrib "${name}"`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
      return output.includes(" H ")
    } catch {
      return name.startsWith(".")
    }
  }
  return name.startsWith(".")
}

function modeString(mode: number): string {
  const s = mode.toString(8)
  const perms = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"]
  let result = ""
  for (let i = s.length - 3; i < s.length; i++) {
    const digit = parseInt(s[i]!, 10)
    result += perms[digit] || "---"
  }
  return result
}

async function readDirEntries(dirPath: string, showHidden: boolean, id: number): Promise<Msg> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const result: FileEntry[] = []
    for (const entry of entries) {
      if (!showHidden && IsHidden(entry.name)) continue
      const fullPath = join(dirPath, entry.name)
      try {
        const s = await stat(fullPath)
        let symlinkTarget: string | undefined
        const isSymlink = entry.isSymbolicLink()
        if (isSymlink) {
          try {
            symlinkTarget = await readlink(fullPath)
          } catch { /* ignore */ }
        }
        result.push({
          name: entry.name,
          isDir: entry.isDirectory(),
          isFile: entry.isFile(),
          isSymlink,
          size: s.size,
          mode: s.mode,
          symlinkTarget,
        })
      } catch {
        continue
      }
    }
    return { type: "readDirMsg", id, entries: result } as Msg
  } catch (err) {
    return { type: "errorMsg", err } as Msg
  }
}

export function readDir(m: FilePickerModel, dirPath: string, showHidden: boolean): Cmd {
  const id = m.id
  return async () => {
    return await readDirEntries(dirPath, showHidden, id)
  }
}

export function Cursor(m: FilePickerModel): string {
  return m.cursor
}

export function SetCursor(m: FilePickerModel, v: string): FilePickerModel {
  return { ...m, cursor: v }
}

export function Init(m: FilePickerModel): Cmd {
  return readDir(m, m.currentDirectory, m.showHidden)
}

export function SetHeight(m: FilePickerModel, h: number): FilePickerModel {
  const newM = { ...m, height: h }
  if (newM.maxIdx > newM.height - 1) {
    newM.maxIdx = newM.minIdx + newM.height - 1
  }
  return newM
}

export function Height(m: FilePickerModel): number {
  return m.height
}

function pushView(m: FilePickerModel, selected: number, minimum: number, maximum: number): FilePickerModel {
  m.selectedStack.push(selected)
  m.minStack.push(minimum)
  m.maxStack.push(maximum)
  return m
}

function popView(m: FilePickerModel): { model: FilePickerModel; selected: number; minIdx: number; maxIdx: number } {
  const selected = m.selectedStack.pop()
  const minIdx = m.minStack.pop()
  const maxIdx = m.maxStack.pop()
  return { model: m, selected, minIdx, maxIdx }
}

export function canSelect(m: FilePickerModel, file: string): boolean {
  if (m.allowedTypes.length <= 0) return true
  for (const ext of m.allowedTypes) {
    if (file.endsWith(ext)) return true
  }
  return false
}

export function HighlightedPath(m: FilePickerModel): string {
  if (m.files.length === 0 || m.selected < 0 || m.selected >= m.files.length) return ""
  return join(m.currentDirectory, m.files[m.selected]!.name)
}

function didSelectFile(m: FilePickerModel, msg: Msg): [boolean, string] {
  if (m.files.length === 0) return [false, ""]
  if (!msg || !("type" in msg)) return [false, ""]
  if ((msg as any).type !== "key") return [false, ""]

  const keyMsg = msg as any
  if (!Matches(m.keyMap.Select, keyMsg)) return [false, ""]

  const f = m.files[m.selected]
  if (!f) return [false, ""]

  let isDir = f.isDir

  if (f.isSymlink && f.symlinkTarget) {
    try {
      const fileStat = statSync(join(m.currentDirectory, f.name)) as any
      if (fileStat.isDirectory()) isDir = true
    } catch {
      // ignore
    }
  }

  if ((!isDir && m.fileAllowed) || (isDir && m.dirAllowed)) {
    if (Matches(m.keyMap.Select, keyMsg)) {
      if (m.path !== "") return [true, m.path]
    }
  }

  return [false, ""]
}

export function DidSelectFile(m: FilePickerModel, msg: Msg): [boolean, string] {
  const [didSelect, selectedPath] = didSelectFile(m, msg)
  if (didSelect && canSelect(m, selectedPath)) return [true, selectedPath]
  return [false, ""]
}

export function DidSelectDisabledFile(m: FilePickerModel, msg: Msg): [boolean, string] {
  const [didSelect, selectedPath] = didSelectFile(m, msg)
  if (didSelect && !canSelect(m, selectedPath)) return [true, selectedPath]
  return [false, ""]
}

export function Update(m: FilePickerModel, msg: Msg): [FilePickerModel, Cmd] {
  if (!msg || !("type" in msg)) return [m, null]

  const msgType = (msg as any).type

  if (msgType === "readDirMsg") {
    const rmsg = msg as ReadDirMsg
    if (rmsg.id !== m.id) return [m, null]
    const newM = { ...m, files: rmsg.entries }
    newM.maxIdx = Math.max(newM.maxIdx, Height(newM) - 1)
    return [newM, null]
  }

  if (msgType === "errorMsg") {
    return [m, null]
  }

  if (msgType === "windowSize") {
    const wmsg = msg as { type: "windowSize"; width: number; height: number }
    let newM = { ...m }
    if (newM.autoHeight) {
      newM = SetHeight(newM, wmsg.height - marginBottom)
    }
    newM.maxIdx = Height(newM) - 1
    return [newM, null]
  }

  if (msgType === "key") {
    const keyMsg = msg as any

    if (Matches(m.keyMap.GoToTop, keyMsg)) {
      const newM = { ...m, selected: 0, minIdx: 0 }
      newM.maxIdx = Height(newM) - 1
      return [newM, null]
    }

    if (Matches(m.keyMap.GoToLast, keyMsg)) {
      const newM = { ...m }
      newM.selected = newM.files.length - 1
      newM.minIdx = newM.files.length - Height(newM)
      newM.maxIdx = newM.files.length - 1
      return [newM, null]
    }

    if (Matches(m.keyMap.Down, keyMsg)) {
      const newM = { ...m }
      newM.selected++
      if (newM.selected >= newM.files.length) {
        newM.selected = newM.files.length - 1
      }
      if (newM.selected > newM.maxIdx) {
        newM.minIdx++
        newM.maxIdx++
      }
      return [newM, null]
    }

    if (Matches(m.keyMap.Up, keyMsg)) {
      const newM = { ...m }
      newM.selected--
      if (newM.selected < 0) {
        newM.selected = 0
      }
      if (newM.selected < newM.minIdx) {
        newM.minIdx--
        newM.maxIdx--
      }
      return [newM, null]
    }

    if (Matches(m.keyMap.PageDown, keyMsg)) {
      const newM = { ...m }
      newM.selected += Height(newM)
      if (newM.selected >= newM.files.length) {
        newM.selected = newM.files.length - 1
      }
      newM.minIdx += Height(newM)
      newM.maxIdx += Height(newM)
      if (newM.maxIdx >= newM.files.length) {
        newM.maxIdx = newM.files.length - 1
        newM.minIdx = newM.maxIdx - Height(newM)
      }
      return [newM, null]
    }

    if (Matches(m.keyMap.PageUp, keyMsg)) {
      const newM = { ...m }
      newM.selected -= Height(newM)
      if (newM.selected < 0) {
        newM.selected = 0
      }
      newM.minIdx -= Height(newM)
      newM.maxIdx -= Height(newM)
      if (newM.minIdx < 0) {
        newM.minIdx = 0
        newM.maxIdx = newM.minIdx + Height(newM)
      }
      return [newM, null]
    }

    if (Matches(m.keyMap.Back, keyMsg)) {
      let newM = { ...m }
      newM.currentDirectory = dirname(newM.currentDirectory)
      if (newM.selectedStack.length() > 0) {
        const popped = popView(newM)
        newM = popped.model
        newM.selected = popped.selected
        newM.minIdx = popped.minIdx
        newM.maxIdx = popped.maxIdx
      } else {
        newM.selected = 0
        newM.minIdx = 0
        newM.maxIdx = Height(newM) - 1
      }
      return [newM, readDir(newM, newM.currentDirectory, newM.showHidden)]
    }

    if (Matches(m.keyMap.Open, keyMsg)) {
      if (m.files.length === 0) return [m, null]

      const f = m.files[m.selected]!
      let isDir = f.isDir

      if (f.isSymlink && f.symlinkTarget) {
        try {
          const fileStat = statSync(join(m.currentDirectory, f.name)) as any
          if (fileStat.isDirectory()) isDir = true
        } catch {
          // ignore
        }
      }

      if ((!isDir && m.fileAllowed) || (isDir && m.dirAllowed)) {
        if (Matches(m.keyMap.Select, keyMsg)) {
          let newM = { ...m }
          newM.path = join(newM.currentDirectory, f.name)
          return [newM, null]
        }
      }

      if (!isDir) return [m, null]

      let newM = { ...m }
      newM.currentDirectory = join(newM.currentDirectory, f.name)
      newM = pushView(newM, newM.selected, newM.minIdx, newM.maxIdx)
      newM.selected = 0
      newM.minIdx = 0
      newM.maxIdx = Height(newM) - 1
      return [newM, readDir(newM, newM.currentDirectory, newM.showHidden)]
    }
  }

  return [m, null]
}

export function View(m: FilePickerModel): string {
  if (m.files.length === 0) {
    return m.styles.emptyDirectory.height(Height(m)).maxHeight(Height(m)).render()
  }

  const lines: string[] = []

  for (let i = 0; i < m.files.length; i++) {
    if (i < m.minIdx || i > m.maxIdx) continue

    const f = m.files[i]!
    const isSymlink = f.isSymlink
    const size = formatBytes(f.size)
    const name = f.name

    const disabled = !canSelect(m, name) && !f.isDir

    if (m.selected === i) {
      let selected = ""
      if (m.showPermissions) {
        selected += " " + modeString(f.mode)
      }
      if (m.showSize) {
        const width = m.styles.fileSize.getWidth()
        selected += size.padStart(width)
      }
      selected += " " + name
      if (isSymlink && f.symlinkTarget) {
        selected += " \u2192 " + f.symlinkTarget
      }
      if (disabled) {
        lines.push(m.styles.disabledCursor.render(m.cursor) + m.styles.disabledSelected.render(selected))
      } else {
        lines.push(m.styles.cursor.render(m.cursor) + m.styles.selected.render(selected))
      }
      continue
    }

    let style = m.styles.file
    if (f.isDir) {
      style = m.styles.directory
    } else if (isSymlink) {
      style = m.styles.symlink
    } else if (disabled) {
      style = m.styles.disabledFile
    }

    let fileName = style.render(name)
    if (isSymlink && f.symlinkTarget) {
      fileName += " \u2192 " + f.symlinkTarget
    }

    let line = m.styles.cursor.render(" ")
    if (m.showPermissions) {
      line += " " + m.styles.permission.render(modeString(f.mode))
    }
    if (m.showSize) {
      line += m.styles.fileSize.render(size)
    }
    line += " " + fileName
    lines.push(line)
  }

  while (lines.length <= Height(m)) {
    lines.push("")
  }

  return lines.join("\n")
}
