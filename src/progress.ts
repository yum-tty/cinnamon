// progress.ts | progress bar component (bubbles port)

import { Style } from "caramel"

/**
 * ProgressModel is the state for the progress bar.
 */
export interface ProgressModel {
  value: number
  total: number
  width: int
  filled: string
  empty: string
  showPercentage: boolean
  styles: {
    bar: Style
    filled: Style
    empty: Style
    percent: Style
  }
}

/**
 * Progress creates a new progress bar model.
 */
export function Progress(width: number): ProgressModel {
  return {
    value: 0,
    total: 100,
    width,
    filled: "█",
    empty: "░",
    showPercentage: true,
    styles: {
      bar: Style(),
      filled: Style().foreground("#7f00ff"),
      empty: Style().foreground("#333333"),
      percent: Style().foreground("#AAAAAA"),
    },
  }
}

/**
 * SetPercent sets the progress bar to a percentage (0-100).
 */
export function SetPercent(m: ProgressModel, percent: number): ProgressModel {
  return { ...m, value: Math.max(0, Math.min(100, percent)) }
}

/**
 * SetProgress sets the progress bar to a value.
 */
export function SetProgress(m: ProgressModel, value: number, total: number): ProgressModel {
  return { ...m, value, total }
}

/**
 * View renders the progress bar.
 */
export function View(m: ProgressModel): string {
  const percent = Math.round((m.value / m.total) * 100)
  const filledCount = Math.round((m.value / m.total) * m.width)
  const emptyCount = m.width - filledCount

  const filled = m.styles.filled.render(m.filled.repeat(filledCount))
  const empty = m.styles.empty.render(m.empty.repeat(emptyCount))
  const percentStr = m.showPercentage
    ? m.styles.percent.render(` ${percent}%`)
    : ""

  return m.styles.bar.render(filled + empty + percentStr)
}
