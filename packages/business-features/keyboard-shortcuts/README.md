# @freelens/keyboard-shortcuts

This Feature enables keyboard shortcuts in Lens

# Usage

```bash
$ npm install @freelens/keyboard-shortcuts
```

```typescript
import { keyboardShortcutsFeature } from "@freelens/keyboard-shortcuts";
import { registerFeature } from "@freelens/feature-core";
import { createContainer } from "@ogre-tools/injectable";

const di = createContainer("some-container");

registerFeature(di, keyboardShortcutsFeature);
```

## Extendability
