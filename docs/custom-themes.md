# Custom Theme and Color Customization

## Overview
Freelens now supports full custom theme and color customization, allowing users to create, edit, and manage their own color themes.

## Features

### Creating Custom Themes
1. Navigate to **Preferences → Application**
2. Click **"Customize Colors..."** button
3. Select a base theme (Light or Dark)
4. Enter a name for your custom theme
5. Customize colors using color pickers or hex values
6. Click **"Save Theme"** to save your custom theme

### Color Categories
Colors are organized into logical categories:
- **Primary Colors**: Main UI colors, accent colors
- **Text Colors**: Text at various levels (primary, secondary, tertiary)
- **Backgrounds**: Main background, sidebars, content areas
- **Status Colors**: Success, error, warning, info indicators
- **Borders**: Border colors and separators

### Managing Custom Themes
- **Edit**: Click "Edit" next to any custom theme to modify it
- **Delete**: Click "Delete" to remove a custom theme
- **Switch**: Use the theme dropdown in Preferences to switch between themes

### Special Color Properties

#### Accent Color (`colorAccent`)
Defines the primary accent color used throughout the application for highlights and interactive elements.

#### Restarted Container Outline (`colorRestartedOutline`)
Customizes the outline color for containers that have been restarted. Default is yellow (`#ff9800`), but can be changed to avoid confusion with other status colors.

## Technical Details

### Theme Structure
Each theme contains:
- `name`: Theme display name
- `type`: "light" or "dark"
- `colors`: 97+ color properties
- `terminalColors`: Terminal color scheme
- `isCustom`: Identifies user-created themes
- `createdAt`: Timestamp of theme creation

### Storage
Custom themes are stored in user preferences and persist across application restarts. They are saved to:
```
%APPDATA%/Freelens/lens-user-store.json
```

### CSS Variables
All theme colors are applied as CSS custom properties (variables) in the format `--colorName`, making them accessible throughout the application.

## Troubleshooting

### Theme Not Appearing
- Ensure you've saved the theme with a unique name
- Restart Freelens if the theme doesn't appear immediately

### Colors Not Applying
- Check that the theme is selected in Preferences → Application
- Verify that the color values are valid hex codes

### Reset to Default
If you encounter issues, you can:
1. Delete the problematic custom theme
2. Switch back to built-in "Light" or "Dark" theme
3. Or select "Sync with computer" to use system theme

## Examples

### Creating a High Contrast Theme
1. Base on Dark theme
2. Name it "High Contrast Dark"
3. Set background colors to pure black (#000000)
4. Set text colors to pure white (#ffffff)
5. Increase border contrast

### Creating a Pastel Theme
1. Base on Light theme
2. Name it "Soft Pastels"
3. Use soft, muted colors for backgrounds
4. Use slightly darker pastels for text
5. Save and activate

## API for Extensions

Custom themes can also be created programmatically using the injectable system:

```typescript
import saveCustomThemeInjectable from "path/to/save-custom-theme.injectable";

const saveTheme = di.inject(saveCustomThemeInjectable);

saveTheme({
  name: "My Theme",
  type: "dark",
  description: "Custom theme",
  author: "Extension Name",
  monacoTheme: "clouds-midnight",
  isCustom: true,
  colors: {
    primary: "#00a7a0",
    // ... other colors
  },
  terminalColors: {},
});
```

## Related Issues
- [#1280](https://github.com/freelensapp/freelens/issues/1280) - Custom theme and color feature
- [#1237](https://github.com/freelensapp/freelens/issues/1237) - Restarted containers with yellow border
- [#550](https://github.com/freelensapp/freelens/issues/550) - Add setting for accent color
