# @freelensapp/color-picker

A reusable color picker component for Freelens.

## Features

- Hex color input
- Visual color picker
- Color validation
- Support for transparency (alpha channel)

## Usage

```tsx
import { ColorPicker } from "@freelensapp/color-picker";

function MyComponent() {
  const [color, setColor] = useState("#00a7a0");

  return (
    <ColorPicker
      label="Primary Color"
      value={color}
      onChange={setColor}
    />
  );
}
```
