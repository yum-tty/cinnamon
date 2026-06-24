// select.ts | select menu component

import type { Model, Msg, Cmd, View } from "cinnamon-bun"
import { CreateView } from "cinnamon-bun"
import { Style } from "caramel"

export interface SelectOption {
  name: string
  description?: string
  value?: any
}

export interface SelectModel extends Model {
  options: SelectOption[]
  cursor: number
  width: number
  height: number
  focused: boolean
  selected: number | null
}

export function Select(
  options: SelectOption[],
  width: number,
  height: number,
): SelectModel {
  const m: SelectModel = {
    options,
    cursor: 0,
    width,
    height,
    focused: true,
    selected: null,

    init(): [SelectModel, Cmd] {
      return [m, null]
    },

    update(msg: Msg): [SelectModel, Cmd] {
      if (!msg || msg.type !== "key") return [m, null]
      if (!m.focused) return [m, null]

      const key = (msg as any).key
      switch (key.name) {
        case "up":
          return [{ ...m, cursor: Math.max(0, m.cursor - 1) }, null]
        case "down":
          return [
            {
              ...m,
              cursor: Math.min(m.options.length - 1, m.cursor + 1),
            },
            null,
          ]
        case "enter":
          return [{ ...m, selected: m.cursor }, null]
        default:
          return [m, null]
      }
    },

    view(): View {
      const lines: string[] = []

      for (let i = 0; i < m.height - 2; i++) {
        const opt = m.options[i]
        if (!opt) {
          lines.push("")
          continue
        }

        const isSelected = i === m.cursor
        const prefix = isSelected ? "▸ " : "  "
        const name = new Style()
          .bold(isSelected)
          .foreground(isSelected ? "#7f00ff" : "#AAAAAA")
          .render(opt.name)

        lines.push(prefix + name)
      }

      return CreateView(new Style()
        .border("rounded")
        .width(m.width)
        .height(m.height)
        .render(lines.join("\n")))
    },
  }
  return m
}
