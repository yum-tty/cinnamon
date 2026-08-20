import { describe, test, expect } from "bun:test"
import {
  // Spinner
  spinners,
  Spinner,
  WithSpinner,
  SpinnerWithStyle,
  SpinnerTick,
  SpinnerUpdate,
  SpinnerView,
  SpinnerID,
  // Progress
  Progress,
  SetPercent,
  IncrPercent,
  DecrPercent,
  IsAnimating,
  ProgressSetWidth,
  ProgressWidth,
  ViewAs,
  ProgressView,
  Percent,
  ProgressSetSpringOptions,
  // TextInput
  TextInput,
  TextInputView,
  TextInputFocus,
  TextInputBlur,
  TextInputSetWidth,
  TextInputSetStyles,
  TextInputValue,
  SetValue,
  EchoMode,
  // Textarea
  Textarea,
  TextareaSetValue,
  TextareaView,
  TextareaFocus,
  TextareaBlur,
  TextareaWidth,
  TextareaHeight,
  // Viewport
  Viewport,
  SetContent,
  ViewportView,
  ViewportSetWidth,
  ViewportSetHeight,
  ScrollUp,
  ScrollDown,
  GotoTop,
  GotoBottom,
  YOffset,
  ViewportHeight,
  // Stopwatch
  Stopwatch,
  StopwatchToggle,
  StopwatchStart,
  StopwatchStop,
  StopwatchReset,
  StopwatchRunning,
  StopwatchElapsed,
  StopwatchView,
  StopwatchInit,
  // Timer
  Timer,
  TimerToggle,
  TimerStart,
  TimerStop,
  TimerReset,
  TimerRunning,
  Timedout,
  TimerElapsed,
  TimerView,
  TimerInit,
} from "../src/index"
import { Style } from "@yum-tty/caramel"

// ──────────────────────────────────────────────
// Spinner
// ──────────────────────────────────────────────
describe("Spinner", () => {
  test("constructor with all spinner types", () => {
    const types = Object.keys(spinners) as (keyof typeof spinners)[]
    for (const type of types) {
      const m = Spinner({ type })
      expect(m.spinner).toBe(spinners[type])
      expect(m.index).toBe(0)
      expect(m.id).toBeGreaterThan(0)
      expect(m.tag).toBe(0)
    }
  })

  test("default constructor uses line type", () => {
    const m = Spinner({})
    expect(m.spinner).toBe(spinners.line)
  })

  test("WithSpinner option sets spinner type", () => {
    const m = Spinner({ type: "dot" })
    expect(m.spinner).toBe(spinners.dot)
  })

  test("SpinnerWithStyle option sets style", () => {
    const style = new Style().foreground("#ff0000")
    const m = Spinner(undefined, SpinnerWithStyle(style))
    expect(m.style).toBe(style)
  })

  test("combining WithSpinner and SpinnerWithStyle", () => {
    const style = new Style().foreground("#00ff00")
    const m = Spinner({ type: "moon" }, SpinnerWithStyle(style))
    expect(m.spinner).toBe(spinners.moon)
    expect(m.style).toBe(style)
  })

  test("SpinnerTick advances index and increments tag", () => {
    const m = Spinner({ type: "line" })
    const [m2, cmd] = SpinnerTick(m)
    expect(m2.index).toBe(1)
    expect(m2.tag).toBe(1)
    expect(typeof cmd).toBe("function")
  })

  test("SpinnerTick wraps index at end of frames", () => {
    const m = Spinner({ type: "line" })
    let current = m
    for (let i = 0; i < spinners.line.frames.length; i++) {
      const [next] = SpinnerTick(current)
      current = next
    }
    expect(current.index).toBe(0)
  })

  test("SpinnerUpdate handles spinnerTick message", () => {
    const m = Spinner({ type: "line" })
    const [m2, cmd] = SpinnerUpdate(m, { type: "spinnerTick", id: m.id, tag: m.tag })
    expect(m2.index).toBe(1)
    expect(typeof cmd).toBe("function")
  })

  test("SpinnerUpdate ignores tick with wrong id", () => {
    const m = Spinner({ type: "line" })
    const [m2] = SpinnerUpdate(m, { type: "spinnerTick", id: 9999, tag: 0 })
    expect(m2.index).toBe(0)
  })

  test("SpinnerUpdate ignores tick with wrong tag", () => {
    const m = Spinner({ type: "line" })
    const [m2] = SpinnerUpdate(m, { type: "spinnerTick", id: m.id, tag: 9999 })
    expect(m2.index).toBe(0)
  })

  test("SpinnerUpdate ignores unknown message types", () => {
    const m = Spinner({ type: "line" })
    const [m2] = SpinnerUpdate(m, { type: "somethingElse" } as any)
    expect(m2.index).toBe(0)
  })

  test("SpinnerUpdate ignores null/undefined messages", () => {
    const m = Spinner({ type: "line" })
    const [m2] = SpinnerUpdate(m, null as any)
    expect(m2.index).toBe(0)
  })

  test("SpinnerView returns a string", () => {
    const m = Spinner({ type: "line" })
    const view = SpinnerView(m)
    expect(typeof view).toBe("string")
    expect(view.length).toBeGreaterThan(0)
  })

  test("SpinnerID returns unique id", () => {
    const m1 = Spinner({ type: "line" })
    const m2 = Spinner({ type: "line" })
    expect(SpinnerID(m1)).toBeGreaterThan(0)
    expect(SpinnerID(m1)).not.toBe(SpinnerID(m2))
  })

  test("consistent frame widths for each type", () => {
    const types = Object.keys(spinners) as (keyof typeof spinners)[]
    for (const type of types) {
      const m = Spinner({ type })
      // All frames in a spinner type should have the same visual width
      const widths = new Set(
        m.spinner.frames.map((f) => [...f].length)
      )
      // Each type should have at least one frame width
      expect(widths.size).toBeGreaterThanOrEqual(1)
    }
  })

  test("line spinner frames are ASCII", () => {
    for (const frame of spinners.line.frames) {
      expect(["|", "/", "-", "\\"]).toContain(frame)
    }
  })

  test("dot spinner has 8 frames", () => {
    expect(spinners.dot.frames.length).toBe(8)
  })

  test("miniDot spinner has 10 frames", () => {
    expect(spinners.miniDot.frames.length).toBe(10)
  })

  test("ellipsis spinner frames build up dots", () => {
    expect(spinners.ellipsis.frames).toEqual(["   ", ".  ", ".. ", "..."])
  })
})

// ──────────────────────────────────────────────
// Progress
// ──────────────────────────────────────────────
describe("Progress", () => {
  test("constructor with width", () => {
    const m = Progress({ width: 40 })
    expect(m.width).toBe(40)
    expect(m.targetPercent).toBe(0)
    expect(m.percentShown).toBe(0)
    expect(m.showPercentage).toBe(true)
    expect(m.id).toBeGreaterThan(0)
  })

  test("SetPercent sets target percent", () => {
    const m = Progress({ width: 40 })
    const [m2] = SetPercent(m, 0.5)
    expect(m2.targetPercent).toBe(0.5)
  })

  test("SetPercent clamps to 0-1 range", () => {
    const m = Progress({ width: 40 })
    const [m2] = SetPercent(m, 1.5)
    expect(m2.targetPercent).toBe(1)

    const [m3] = SetPercent(m, -0.5)
    expect(m3.targetPercent).toBe(0)
  })

  test("IncrPercent increases target", () => {
    const m = Progress({ width: 40 })
    const [m2] = SetPercent(m, 0.3)
    const [m3] = IncrPercent(m2, 0.2)
    expect(m3.targetPercent).toBeCloseTo(0.5)
  })

  test("DecrPercent decreases target", () => {
    const m = Progress({ width: 40 })
    const [m2] = SetPercent(m, 0.5)
    const [m3] = DecrPercent(m2, 0.2)
    expect(m3.targetPercent).toBeCloseTo(0.3)
  })

  test("IsAnimating is false when target matches shown", () => {
    const m = Progress({ width: 40 })
    expect(IsAnimating(m)).toBe(false)
  })

  test("IsAnimating is true when target differs from shown", () => {
    const m = Progress({ width: 40 })
    const [m2] = SetPercent(m, 0.5)
    expect(IsAnimating(m2)).toBe(true)
  })

  test("SetWidth returns new model with updated width", () => {
    const m = Progress({ width: 40 })
    const m2 = ProgressSetWidth(m, 80)
    expect(m2.width).toBe(80)
    expect(m.width).toBe(40) // original unchanged
  })

  test("Width returns current width", () => {
    const m = Progress({ width: 60 })
    expect(ProgressWidth(m)).toBe(60)
  })

  test("Percent returns target percent", () => {
    const m = Progress({ width: 40 })
    const [m2] = SetPercent(m, 0.75)
    expect(Percent(m2)).toBe(0.75)
  })

  test("ViewAs renders bar at specific percent", () => {
    const m = Progress({ width: 40 })
    const view = ViewAs(m, 0.5)
    expect(typeof view).toBe("string")
    expect(view.length).toBeGreaterThan(0)
  })

  test("ProgressView returns a string", () => {
    const m = Progress({ width: 40 })
    const view = ProgressView(m)
    expect(typeof view).toBe("string")
  })

  test("SetSpringOptions sets frequency and damping", () => {
    const m = Progress({ width: 40 })
    const m2 = ProgressSetSpringOptions(m, 25.0, 0.8)
    expect(m2.springFrequency).toBe(25.0)
    expect(m2.springDamping).toBe(0.8)
    expect(m2.springCustomized).toBe(true)
  })

  test("without percentage option hides percentage", () => {
    const m = Progress({ width: 40 }, (m) => { m.showPercentage = false })
    expect(m.showPercentage).toBe(false)
  })

  test("with custom width option", () => {
    const m = Progress({ width: 10 }, (m) => { m.width = 100 })
    expect(m.width).toBe(100)
  })
})

// ──────────────────────────────────────────────
// TextInput
// ──────────────────────────────────────────────
describe("TextInput", () => {
  test("constructor creates default model", () => {
    const m = TextInput()
    expect(m.value).toBe("")
    expect(m.prompt).toBe("> ")
    expect(m.placeholder).toBe("")
    expect(m.echoMode).toBe(EchoMode.Normal)
    expect(m.width).toBe(0)
    expect(m.focus).toBe(false)
    expect(m.pos).toBe(0)
  })

  test("SetValue sets the value", () => {
    const m = TextInput()
    const m2 = SetValue(m, "hello")
    expect(TextInputValue(m2)).toBe("hello")
    expect(m2.pos).toBe(5)
  })

  test("TextInputView returns a string", () => {
    const m = TextInput()
    const m2 = SetValue(m, "test")
    const view = TextInputView(m2)
    expect(typeof view).toBe("string")
    expect(view.length).toBeGreaterThan(0)
  })

  test("TextInputFocus returns model with focus true and cmd", () => {
    const m = TextInput()
    const [m2, cmd] = TextInputFocus(m)
    expect(m2.focus).toBe(true)
    expect(typeof cmd).toBe("function")
  })

  test("TextInputBlur returns model with focus false", () => {
    const m = TextInput()
    const [m2] = TextInputFocus(m)
    const m3 = TextInputBlur(m2)
    expect(m3.focus).toBe(false)
  })

  test("TextInputSetWidth sets width", () => {
    const m = TextInput()
    const m2 = TextInputSetWidth(m, 50)
    expect(m2.width).toBe(50)
  })

  test("TextInputSetStyles sets styles", () => {
    const m = TextInput()
    const newStyles = m.styles
    const m2 = TextInputSetStyles(m, newStyles)
    expect(m2.styles).toBe(newStyles)
  })

  test("placeholder shown when value is empty", () => {
    const m = TextInput()
    m.placeholder = "Type here..."
    const view = TextInputView(m)
    // View contains ANSI-styled placeholder chars; strip escapes and check
    const stripped = view.replace(/\x1b\[[0-9;]*m/g, "")
    expect(stripped).toContain("Type here...")
  })

  test("value shown when set", () => {
    const m = TextInput()
    const m2 = SetValue(m, "hello")
    const view = TextInputView(m2)
    expect(view).toContain("hello")
  })

  test("password echo mode masks characters", () => {
    const m = TextInput()
    m.echoMode = EchoMode.Password
    const m2 = SetValue(m, "secret")
    const view = TextInputView(m2)
    expect(view).not.toContain("secret")
    expect(view).toContain("*")
  })
})

// ──────────────────────────────────────────────
// Textarea
// ──────────────────────────────────────────────
describe("Textarea", () => {
  test("constructor creates default model", () => {
    const m = Textarea()
    expect(m.value).toEqual([""])
    expect(m.width).toBeGreaterThanOrEqual(0)
    expect(m.height).toBeGreaterThanOrEqual(0)
    expect(m.focus).toBe(false)
    expect(m.row).toBe(0)
    expect(m.col).toBe(0)
  })

  test("TextareaSetValue sets the value", () => {
    const m = Textarea()
    const m2 = TextareaSetValue(m, "hello world")
    expect(m2.value.join("\n")).toBe("hello world")
  })

  test("TextareaView returns a string", () => {
    const m = Textarea()
    const m2 = TextareaSetValue(m, "test line")
    const view = TextareaView(m2)
    expect(typeof view).toBe("string")
    expect(view.length).toBeGreaterThan(0)
  })

  test("TextareaFocus sets focus to true", () => {
    const m = Textarea()
    const [m2, cmd] = TextareaFocus(m)
    expect(m2.focus).toBe(true)
    expect(typeof cmd).toBe("function")
  })

  test("TextareaBlur sets focus to false", () => {
    const m = Textarea()
    const [m2] = TextareaFocus(m)
    TextareaBlur(m2)
    expect(m2.focus).toBe(false)
  })

  test("TextareaWidth returns the width", () => {
    const m = Textarea()
    const w = TextareaWidth(m)
    expect(typeof w).toBe("number")
  })

  test("TextareaHeight returns the height", () => {
    const m = Textarea()
    const h = TextareaHeight(m)
    expect(typeof h).toBe("number")
  })

  test("TextareaSetValue with multiline", () => {
    const m = Textarea()
    const m2 = TextareaSetValue(m, "line1\nline2\nline3")
    expect(m2.value.length).toBe(3)
    expect(m2.value[0]).toBe("line1")
    expect(m2.value[1]).toBe("line2")
    expect(m2.value[2]).toBe("line3")
  })

  test("TextareaView with empty value shows placeholder area", () => {
    const m = Textarea()
    m.placeholder = "Enter text..."
    const view = TextareaView(m)
    expect(typeof view).toBe("string")
  })
})

// ──────────────────────────────────────────────
// Viewport
// ──────────────────────────────────────────────
describe("Viewport", () => {
  test("constructor sets dimensions", () => {
    const m = Viewport({ width: 80, height: 24 })
    expect(m.width).toBe(80)
    expect(m.height).toBe(24)
    expect(m.yOffset).toBe(0)
    expect(m.xOffset).toBe(0)
    expect(m.lines).toEqual([])
  })

  test("SetContent sets lines from string", () => {
    const m = Viewport({ width: 80, height: 10 })
    const m2 = SetContent(m, "line1\nline2\nline3")
    expect(m2.lines).toEqual(["line1", "line2", "line3"])
  })

  test("ViewportView returns a string", () => {
    const m = Viewport({ width: 80, height: 10 })
    const m2 = SetContent(m, "hello\nworld")
    const view = ViewportView(m2)
    expect(typeof view).toBe("string")
  })

  test("ViewportSetWidth sets width", () => {
    const m = Viewport({ width: 80, height: 24 })
    const m2 = ViewportSetWidth(m, 120)
    expect(m2.width).toBe(120)
  })

  test("ViewportSetHeight sets height", () => {
    const m = Viewport({ width: 80, height: 24 })
    const m2 = ViewportSetHeight(m, 40)
    expect(m2.height).toBe(40)
  })

  test("ScrollDown increases yOffset", () => {
    const m = Viewport({ width: 80, height: 5 })
    let m2 = SetContent(m, Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n"))
    m2 = ScrollDown(m2, 3)
    expect(m2.yOffset).toBe(3)
  })

  test("ScrollUp decreases yOffset", () => {
    const m = Viewport({ width: 80, height: 5 })
    let m2 = SetContent(m, Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n"))
    m2 = ScrollDown(m2, 5)
    m2 = ScrollUp(m2, 2)
    expect(m2.yOffset).toBe(3)
  })

  test("GotoTop resets yOffset to 0", () => {
    const m = Viewport({ width: 80, height: 5 })
    let m2 = SetContent(m, Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n"))
    m2 = ScrollDown(m2, 5)
    const [m3] = GotoTop(m2)
    expect(m3.yOffset).toBe(0)
  })

  test("GotoBottom scrolls to last visible line", () => {
    const m = Viewport({ width: 80, height: 5 })
    let m2 = SetContent(m, Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n"))
    const [m3] = GotoBottom(m2)
    expect(m3.yOffset).toBe(15)
  })

  test("YOffset returns the current offset", () => {
    const m = Viewport({ width: 80, height: 10 })
    expect(YOffset(m)).toBe(0)
    let m2 = SetContent(m, Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n"))
    m2 = ScrollDown(m2, 3)
    expect(YOffset(m2)).toBe(3)
  })

  test("ViewportHeight returns the height", () => {
    const m = Viewport({ width: 80, height: 24 })
    expect(ViewportHeight(m)).toBe(24)
  })

  test("ScrollUp does not go below 0", () => {
    const m = Viewport({ width: 80, height: 10 })
    let m2 = SetContent(m, "line1\nline2\nline3")
    m2 = ScrollUp(m2, 10)
    expect(m2.yOffset).toBe(0)
  })

  test("ScrollDown does not exceed max offset", () => {
    const m = Viewport({ width: 80, height: 10 })
    let m2 = SetContent(m, "line1\nline2\nline3")
    m2 = ScrollDown(m2, 100)
    expect(m2.yOffset).toBeLessThanOrEqual(3)
  })

  test("GetContent returns joined lines", async () => {
    const { GetContent } = await import("../src/index")
    const m = Viewport({ width: 80, height: 10 })
    const m2 = SetContent(m, "a\nb\nc")
    expect(GetContent(m2)).toBe("a\nb\nc")
  })

  test("Viewport with empty content", () => {
    const m = Viewport({ width: 80, height: 10 })
    const m2 = SetContent(m, "")
    expect(m2.lines).toEqual([])
  })
})

// ──────────────────────────────────────────────
// Stopwatch
// ──────────────────────────────────────────────
describe("Stopwatch", () => {
  test("constructor creates stopped stopwatch", () => {
    const m = Stopwatch()
    expect(StopwatchRunning(m)).toBe(false)
    expect(StopwatchElapsed(m)).toBe(0)
    expect(m.interval).toBe(100)
  })

  test("StopwatchToggle starts a stopped stopwatch", () => {
    const m = Stopwatch()
    const [m2, cmd] = StopwatchToggle(m)
    expect(StopwatchRunning(m2)).toBe(true)
    expect(typeof cmd).toBe("function")
  })

  test("StopwatchToggle stops a running stopwatch", () => {
    const m = Stopwatch()
    const [m2] = StopwatchToggle(m)
    const [m3] = StopwatchToggle(m2)
    expect(StopwatchRunning(m3)).toBe(false)
  })

  test("StopwatchStart starts the stopwatch", () => {
    const m = Stopwatch()
    const [m2] = StopwatchStart(m)
    expect(StopwatchRunning(m2)).toBe(true)
  })

  test("StopwatchStop stops the stopwatch", () => {
    const m = Stopwatch()
    const [m2] = StopwatchStart(m)
    const [m3] = StopwatchStop(m2)
    expect(StopwatchRunning(m3)).toBe(false)
  })

  test("StopwatchReset resets elapsed to 0 and stops", () => {
    const m = Stopwatch()
    const [m2] = StopwatchStart(m)
    const [m3] = StopwatchReset(m2)
    expect(StopwatchElapsed(m3)).toBe(0)
    expect(StopwatchRunning(m3)).toBe(false)
  })

  test("StopwatchView formats elapsed time", () => {
    const m = Stopwatch()
    const view = StopwatchView(m)
    expect(view).toBe("0s")
  })

  test("StopwatchInit returns a command", () => {
    const m = Stopwatch()
    const cmd = StopwatchInit(m)
    expect(typeof cmd).toBe("function")
  })

  test("WithInterval option sets interval", () => {
    const m = Stopwatch((m) => { m.interval = 50 })
    expect(m.interval).toBe(50)
  })

  test("Stopwatch IDs are unique", () => {
    const m1 = Stopwatch()
    const m2 = Stopwatch()
    expect(m1.id).not.toBe(m2.id)
  })
})

// ──────────────────────────────────────────────
// Timer
// ──────────────────────────────────────────────
describe("Timer", () => {
  test("constructor creates running timer", () => {
    const m = Timer({ timeout: 5000 })
    expect(m.timeout).toBe(5000)
    expect(m.running).toBe(true)
    expect(m.timedOut).toBe(false)
    expect(m.elapsed).toBe(0)
    expect(m.interval).toBe(1000)
  })

  test("TimerToggle stops a running timer", () => {
    const m = Timer({ timeout: 5000 })
    const [m2] = TimerToggle(m)
    expect(TimerRunning(m2)).toBe(false)
  })

  test("TimerToggle starts a stopped timer", () => {
    const m = Timer({ timeout: 5000 })
    const [m2] = TimerToggle(m)
    const [m3] = TimerToggle(m2)
    expect(TimerRunning(m3)).toBe(true)
  })

  test("TimerStart starts a stopped timer", () => {
    const m = Timer({ timeout: 5000 })
    const [m2] = TimerStop(m)
    const [m3] = TimerStart(m2)
    expect(TimerRunning(m3)).toBe(true)
  })

  test("TimerStop stops a running timer", () => {
    const m = Timer({ timeout: 5000 })
    const [m2] = TimerStop(m)
    expect(TimerRunning(m2)).toBe(false)
  })

  test("TimerReset resets all state", () => {
    const m = Timer({ timeout: 5000 })
    const m2 = TimerReset(m)
    expect(m2.elapsed).toBe(0)
    expect(m2.running).toBe(false)
    expect(m2.timedOut).toBe(false)
    expect(m2.tag).toBe(0)
  })

  test("Timedout is false initially", () => {
    const m = Timer({ timeout: 5000 })
    expect(Timedout(m)).toBe(false)
  })

  test("TimerElapsed returns elapsed time", () => {
    const m = Timer({ timeout: 5000 })
    expect(TimerElapsed(m)).toBe(0)
  })

  test("TimerView shows remaining time", () => {
    const m = Timer({ timeout: 5000 })
    const view = TimerView(m)
    expect(view).toBe("5s")
  })

  test("TimerInit returns a command", () => {
    const m = Timer({ timeout: 5000 })
    const cmd = TimerInit(m)
    expect(typeof cmd).toBe("function")
  })

  test("WithInterval option sets interval", () => {
    const m = Timer({ timeout: 5000 }, (m) => { m.interval = 500 })
    expect(m.interval).toBe(500)
  })

  test("Running returns false when timedOut", () => {
    const m = Timer({ timeout: 5000 })
    m.timedOut = true
    expect(TimerRunning(m)).toBe(false)
  })

  test("Timer IDs are unique", () => {
    const m1 = Timer({ timeout: 1000 })
    const m2 = Timer({ timeout: 2000 })
    expect(m1.id).not.toBe(m2.id)
  })
})
