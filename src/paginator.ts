// paginator.ts | paginator component (bubbles port)

import { Style } from "caramel"

/**
 * PaginatorType is the type of paginator.
 */
export type PaginatorType = "dots" | "arabic"

/**
 * PaginatorModel is the state for the paginator.
 */
export interface PaginatorModel {
  page: number
  totalPages: number
  perPage: number
  type: PaginatorType
  activeDot: string
  inactiveDot: string
  styles: {
    active: Style
    inactive: Style
    arabic: Style
  }
}

/**
 * Paginator creates a new paginator model.
 */
export function Paginator(type: PaginatorType = "dots"): PaginatorModel {
  return {
    page: 0,
    totalPages: 1,
    perPage: 10,
    type,
    activeDot: "●",
    inactiveDot: "○",
    styles: {
      active: Style().foreground("#7f00ff"),
      inactive: Style().foreground("#666666"),
      arabic: Style().foreground("#AAAAAA"),
    },
  }
}

/**
 * SetTotalPages sets the total number of pages.
 */
export function SetTotalPages(m: PaginatorModel, total: number): PaginatorModel {
  return { ...m, totalPages: Math.max(1, total) }
}

/**
 * PrevPage goes to the previous page.
 */
export function PrevPage(m: PaginatorModel): PaginatorModel {
  return { ...m, page: Math.max(0, m.page - 1) }
}

/**
 * NextPage goes to the next page.
 */
export function NextPage(m: PaginatorModel): PaginatorModel {
  return { ...m, page: Math.min(m.totalPages - 1, m.page + 1) }
}

/**
 * GoToStart goes to the first page.
 */
export function GoToStart(m: PaginatorModel): PaginatorModel {
  return { ...m, page: 0 }
}

/**
 * GoToEnd goes to the last page.
 */
export function GoToEnd(m: PaginatorModel): PaginatorModel {
  return { ...m, page: m.totalPages - 1 }
}

/**
 * OnFirstPage returns true if on the first page.
 */
export function OnFirstPage(m: PaginatorModel): boolean {
  return m.page === 0
}

/**
 * OnLastPage returns true if on the last page.
 */
export function OnLastPage(m: PaginatorModel): boolean {
  return m.page >= m.totalPages - 1
}

/**
 * ItemsOnPage returns the number of items on the current page.
 */
export function ItemsOnPage(m: PaginatorModel, totalItems: number): number {
  const start = m.page * m.perPage
  const end = Math.min(start + m.perPage, totalItems)
  return Math.max(0, end - start)
}

/**
 * GetSliceBounds returns the start and end indices for the current page.
 */
export function GetSliceBounds(m: PaginatorModel, totalItems: number): [number, number] {
  const start = m.page * m.perPage
  const end = Math.min(start + m.perPage, totalItems)
  return [start, end]
}

/**
 * View renders the paginator.
 */
export function View(m: PaginatorModel): string {
  if (m.totalPages <= 1) return ""

  if (m.type === "arabic") {
    return m.styles.arabic.render(`${m.page + 1}/${m.totalPages}`)
  }

  // Dots
  const dots: string[] = []
  for (let i = 0; i < m.totalPages; i++) {
    if (i === m.page) {
      dots.push(m.styles.active.render(m.activeDot))
    } else {
      dots.push(m.styles.inactive.render(m.inactiveDot))
    }
  }

  return dots.join(" ")
}
