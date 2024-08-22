# @freelens/react-application

# Usage

```bash
$ npm install @freelens/react-application
```

```typescript
import { reactApplicationFeature } from "@freelens/react-application";
import { registerFeature } from "@freelens/feature-core";
import { createContainer } from "@ogre-tools/injectable";

const di = createContainer("some-container");

registerFeature(di, reactApplicationRootFeature);
```

## Extendability
