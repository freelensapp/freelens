# Custom Theme System

This directory contains the theme system for Freelens, including support for custom user-created themes.

## Architecture

### Core Components

1. **Theme Definition (`lens-theme.ts`)**
   - Defines the `LensTheme` interface with all theme properties
   - Contains 130+ color variables for complete UI customization
   - Supports terminal colors and Monaco editor themes

2. **Built-in Themes**
   - `lens-dark.injectable.ts` - The default dark theme
   - `lens-light.injectable.ts` - The light theme
   - Both are registered with `lensThemeDeclarationInjectionToken`

3. **Custom Theme Storage (`custom-themes-storage.injectable.ts`)**
   - Manages user-created custom themes
   - Persists themes to a separate file (`lens-custom-themes`)
   - Provides CRUD operations for custom themes

4. **Theme Management**
   - `themes.injectable.ts` - Combines built-in and custom themes
   - `active.injectable.ts` - Determines which theme is currently active
   - `apply-lens-theme.injectable.ts` - Applies theme by setting CSS variables

## Features

### For Users

1. **Create Custom Themes**
   - Start from any existing theme
   - Customize all colors via a visual editor
   - Organized by category (General, Text, Background, etc.)

2. **Theme Operations**
   - Duplicate any theme to create variations
   - Edit custom themes at any time
   - Delete custom themes (built-in themes are protected)
   - Import/export themes as JSON files

3. **Color Editor**
   - Visual color picker
   - Hex code input with validation
   - Real-time preview of changes

### For Extension Developers

Extensions can register custom themes programmatically:

```typescript
import { Theme } from "@freelensapp/core/renderer";

// Register a custom theme
const success = Theme.registerTheme({
  name: "My Extension Theme",
  type: "dark",
  description: "A custom theme from my extension",
  author: "Extension Author",
  monacoTheme: "clouds-midnight",
  colors: {
    // ... all required colors
  },
  terminalColors: {
    // ... optional terminal colors
  },
});

// Unregister a theme
Theme.unregisterTheme("My Extension Theme");

// Get all themes
const allThemes = Theme.getThemes();
```

## Theme Structure

### Required Color Properties

Every theme must define these color properties:

**General Colors:**
- `blue`, `magenta`, `golden`, `halfGray`, `primary`

**Text Colors:**
- `textColorPrimary`, `textColorSecondary`, `textColorTertiary`
- `textColorAccent`, `textColorDimmed`

**Background Colors:**
- `mainBackground`, `secondaryBackground`, `contentColor`
- `layoutBackground`, `layoutTabsBackground`

**UI Component Colors:**
- Buttons: `buttonPrimaryBackground`, `buttonDefaultBackground`, etc.
- Tables: `tableBgcStripe`, `tableBgcSelected`, etc.
- Sidebar: `sidebarBackground`, `sidebarActiveColor`, etc.
- And many more...

See `lens-theme.ts` for the complete list of all 130+ color properties.

### Terminal Colors (Optional)

Terminal colors follow the XTerm color specification:
- Basic colors: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
- Bright variants: `brightBlack`, `brightRed`, etc.
- Special colors: `background`, `foreground`, `cursor`, `selectionBackground`

## File Storage

### Custom Themes
- **Location**: `~/.config/Freelens/lens-custom-themes.json`
- **Format**: JSON array of theme objects
- **Backup**: Recommended to export important themes

### User Preferences
- **Location**: `~/.config/Freelens/lens-user-store.json`
- **Contains**: Selected theme preference and other user settings

## Implementation Details

### CSS Variable System

Themes are applied by setting CSS custom properties on the document root:

```typescript
document.documentElement.style.setProperty('--primary', '#00a7a0');
```

All color properties are prefixed with `--` and can be used in SCSS:

```scss
.my-component {
  background: var(--mainBackground);
  color: var(--textColorPrimary);
}
```

### Reactive Theme Switching

The active theme is a MobX computed value that reacts to:
- User preference changes
- System theme changes (when "Sync with computer" is selected)
- Custom theme additions/removals

### Validation

Theme validation ensures:
- All required colors are present
- Color values are valid CSS colors
- Theme names are unique
- Monaco theme references are valid

## Adding New Color Variables

To add a new color variable:

1. Add it to the `LensColorName` type in `lens-theme.ts`
2. Add it to both built-in theme definitions
3. Add it to the validation's required colors list
4. Update this documentation

## Troubleshooting

### Theme Not Appearing
- Check that the theme name is unique
- Verify all required colors are defined
- Check browser console for validation errors

### Colors Not Applying
- Ensure CSS variables are used correctly: `var(--colorName)`
- Check that theme was successfully loaded
- Verify the theme is set as active

### Import Fails
- Confirm JSON structure matches theme interface
- Check that all required fields are present
- Validate color values are proper CSS colors
