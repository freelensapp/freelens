# @freelensapp/keyboard-shortcuts

This Feature enables keyboard shortcuts in Lens

## Usage

```sh
npm install @freelensapp/keyboard-shortcuts
```

```typescript
import { keyboardShortcutsFeature } from "@freelensapp/keyboard-shortcuts";
import { registerFeature } from "@freelensapp/feature-core";
import { createContainer } from "@ogre-tools/injectable";

const di = createContainer("some-container");

registerFeature(di, keyboardShortcutsFeature);
```

## Extendability
