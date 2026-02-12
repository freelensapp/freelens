# Custom Theme Implementation Plan

## Task Overview
Implement custom theme and color feature for Freelens
- BountyHub: https://www.bountyhub.dev/en/bounty/view/fe773082-b67f-4af3-a5e6-7011ddd18dcd/custom-theme-and-color-feature
- GitHub Issue: https://github.com/freelensapp/freelens/issues/1280
- Amount: $50.00

## Analysis

### Current Theme System
1. **Theme Definition** (`packages/core/src/renderer/themes/lens-theme.ts`)
   - `LensTheme` interface with colors, terminalColors, monacoTheme
   - 80+ color variables defined
   - Support for dark/light theme types

2. **Existing Themes**
   - Dark theme: `lens-dark.injectable.ts`
   - Light theme: `lens-light.injectable.ts`
   - Theme registration via `lensThemeDeclarationInjectionToken`

3. **Theme Selection**
   - UI: `packages/core/src/features/preferences/renderer/preference-items/application/theme/theme.tsx`
   - State: `userPreferencesStateInjectable`
   - Preference: `lens-color-theme-preference`

4. **Theme Application**
   - `apply-lens-theme.injectable.ts` - applies colors to document
   - `active-theme.injectable.ts` - manages active theme state

### Implementation Plan

#### Phase 1: Custom Theme Data Structure
Create a new injectable to store custom themes in user preferences
- File: `packages/core/src/features/user-preferences/common/custom-themes.injectable.ts`
- Store custom themes as JSON in user preferences
- Support multiple custom themes with unique IDs

#### Phase 2: Custom Theme Editor UI
Create a new preference item for theme customization
- File: `packages/core/src/features/preferences/renderer/preference-items/application/custom-theme/custom-theme.tsx`
- Features:
  - Color picker for each color variable
  - Theme name and description inputs
  - Save/Delete custom themes
  - Export/Import theme functionality

#### Phase 3: Theme Registration
Modify theme registration to include custom themes
- File: `packages/core/src/renderer/themes/themes.injectable.ts`
- Combine built-in themes with custom themes
- Ensure custom themes are validated

#### Phase 4: Integration with Theme Selector
Update existing theme selector to include custom themes
- File: `packages/core/src/features/preferences/renderer/preference-items/application/theme/theme.tsx`
- Add "Create Custom Theme" button
- Display custom themes in the dropdown

## Implementation Steps

1. Create custom theme storage injectable
2. Create custom theme editor UI component
3. Add color picker component (reuse existing or create new)
4. Implement save/load custom theme functionality
5. Update theme registration to include custom themes
6. Update theme selector UI
7. Test with various color combinations
8. Ensure persistence across restarts

## Key Files to Modify/Create

### New Files
- `packages/core/src/features/user-preferences/common/custom-themes.injectable.ts`
- `packages/core/src/features/preferences/renderer/preference-items/application/custom-theme/`
  - `custom-theme.tsx`
  - `custom-theme-preference-block.injectable.ts`

### Modified Files
- `packages/core/src/renderer/themes/themes.injectable.ts`
- `packages/core/src/features/preferences/renderer/preference-items/application/theme/theme.tsx`
- `packages/core/src/features/user-preferences/common/state.injectable.ts` (add customThemes field)

## Technical Details

### Color Picker
- Use existing MUI color picker or create a simple one
- Support hex, rgb, and color name formats
- Real-time preview of color changes

### Theme Persistence
- Store in user preferences JSON
- Format:
```json
{
  "customThemes": {
    "theme-1": {
      "name": "My Custom Theme",
      "type": "dark",
      "colors": {...},
      "terminalColors": {...},
      "description": "...",
      "author": "User"
    }
  }
}
```

### Validation
- Ensure all required color variables are present
- Validate color format
- Check for naming conflicts

## Testing Checklist
- [ ] Create custom theme
- [ ] Edit existing custom theme
- [ ] Delete custom theme
- [ ] Apply custom theme
- [ ] Persist across restart
- [ ] Export/import theme
- [ ] Validate all color variables
- [ ] Test on different platforms (macOS, Windows, Linux)