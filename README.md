# Cinnamon

<p>
    <a href="https://github.com/charmbracelet/bubbles"><img src="https://img.shields.io/badge/original-bubbles-blue" alt="Original Bubbles"></a>
    <a href="https://github.com/yum-tty/cinnamon"><img src="https://img.shields.io/badge/port-cinnamon-green" alt="Cinnamon Port"></a>
    <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-bun-black" alt="Bun Runtime"></a>
</p>

Common UI components for [Cinnamon Bun](https://github.com/yum-tty/cinnamon-bun). A TypeScript port of [Bubbles](https://github.com/charmbracelet/bubbles) for Bun.

Cinnamon provides reusable TUI components like text inputs, lists, spinners, and more. Each component follows the Bubble Tea architecture and can be composed together to build complex interfaces.

## Installation

```bash
bun add github:yum-tty/cinnamon
```

Or install from a specific package:

```bash
bun add cinnamon
```

## Components

| Component | Description |
|-----------|-------------|
| **TextInput** | Single-line text input with cursor, echo modes, and suggestions |
| **Textarea** | Multi-line text input with cursor and line editing |
| **List** | Scrollable list with filtering, pagination, and custom delegates |
| **Select** | Single selection from a list of options |
| **Spinner** | Animated spinner with multiple styles |
| **Viewport** | Scrollable text viewport |
| **Progress** | Progress bar with percentage display |
| **Paginator** | Page navigation with dots or arabic numerals |
| **Table** | Data table with columns and rows |
| **Help** | Help bar showing key bindings |
| **Cursor** | Virtual cursor for text inputs |

## Quick Start

### Text Input

```typescript
import { TextInput, TextInputUpdate, TextInputView, Focus } from "cinnamon"
import { NewProgram, type Model, type Msg, type Cmd } from "cinnamon-bun"

const input = TextInput()
input.prompt = "Enter name: "
input.placeholder = "John Doe"

interface AppModel {
  input: typeof input
}

function init(): [Model, Cmd] {
  const [focusedInput, cmd] = Focus(input)
  return [{ input: focusedInput }, cmd]
}

function update(model: AppModel, msg: Msg): [AppModel, Cmd] {
  const [newInput, cmd] = TextInputUpdate(model.input, msg)
  return [{ ...model, input: newInput }, cmd]
}

function view(model: AppModel): string {
  return TextInputView(model.input)
}

NewProgram({ model: { init, update, view } }).run()
```

### List

```typescript
import { List, DefaultItem, DefaultDelegate, ListUpdate, ListView, SetItems } from "cinnamon"

const items = [
  new DefaultItem("Item 1", "Description 1"),
  new DefaultItem("Item 2", "Description 2"),
  new DefaultItem("Item 3", "Description 3"),
]

const delegate = new DefaultDelegate()
const list = List(items, delegate, 40, 10)

// Update with keyboard input
const [newList, cmd] = ListUpdate(list, { type: "key", name: "down" })

// Render
const view = ListView(newList)
```

### Spinner

```typescript
import { Spinner, SpinCmd, SpinnerUpdate, SpinnerView } from "cinnamon"

const spinner = Spinner("dot")
const [startedSpinner, cmd] = SpinnerUpdate(spinner, { type: "start" })

// In your update loop:
const [newSpinner, newCmd] = SpinnerUpdate(spinner, { type: "spinnerTick" })

// Render
const view = SpinnerView(newSpinner)
```

### Progress Bar

```typescript
import { Progress, SetPercent, ProgressView } from "cinnamon"

const progress = Progress(40)
const updated = SetPercent(progress, 75)

// Render
const view = ProgressView(updated)
// Output: ████████████████████░░░░░░░░░░░░░░░░░░░░ 75%
```

## Key Bindings

All components use a consistent key binding system:

```typescript
import { NewBinding, Matches, type KeyMap } from "cinnamon"

const keyMap: KeyMap = {
  up: NewBinding({ keys: ["up", "k"], help: "move up" }),
  down: NewBinding({ keys: ["down", "j"], help: "move down" }),
}

// Check if a key matches a binding
const keyMsg = { type: "key", name: "up", ctrl: false, shift: false, alt: false, meta: false, sequence: "" }
if (Matches(keyMap.up, keyMsg)) {
  // Handle up key
}
```

## Styling

Components use [Caramel](https://github.com/cinnamon-eco/caramel) for styling:

```typescript
import { NewStyle } from "caramel"

const style = NewStyle()
  .bold(true)
  .foreground("#7f00ff")
  .padding(1, 2)

console.log(style.render("Styled text"))
```

## Examples

See the [examples](./examples) directory for complete working examples.

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Components API](./docs/components.md)
- [Key Bindings](./docs/keybindings.md)
- [Styling Guide](./docs/styling.md)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## License

[MIT](./LICENSE)

---

Based on [Bubbles](https://github.com/charmbracelet/bubbles) by [Charm](https://charm.sh).
