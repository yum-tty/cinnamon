// select.ts | select menu component

import type { Model, Msg, Cmd } from "cinnamon-bun"
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
  return {
    options,
    cursor: 0,
    width,
    height,
    focused: true,
    selected: null,

    init(): Cmd {
      return null
    },

    update(msg: Msg): [SelectModel, Cmd] {
      if (msg.type !== "key") return [this, null]
      if (!this.focused) return [this, null]

      const key = (msg as any).key
      switch (key.name) {
        case "up":
          return [{ ...this, cursor: Math.max(0, this.cursor - 1) }, null]
        case "down":
          return [
            {
              ...this,
              cursor: Math.min(this.options.length - 1, this.cursor + 1),
            },
            null,
          ]
        case "enter":
          return [{ ...this, selected: this.cursor }, null]
        default:
          return [this, null]
      }
    },

    view(): string {
      const lines: string[] = []

      for (let i = 0; i < this.height - 2; i++) {
        const opt = this.options[i]
        if (!opt) {
          lines.push("")
          continue
        }

        const isSelected = i === this.cursor
        const prefix = isSelected ? "▸ " : "  "
        const name = Style()
          .bold(isSelected)
          .foreground(isSelected ? "#7f00ff" : "#AAAAAA")
          .render(opt.name)

        lines.push(prefix + name)
      }

      return Style()
        .border("rounded")
        .width(this.width)
        .height(this.height)
        .render(lines.join("\n"))
    },
  }
}
