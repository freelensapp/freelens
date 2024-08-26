# @freelensapp/react-application

# Usage

```bash
$ npm install @freelensapp/react-application
```

```typescript
import { reactApplicationFeature } from "@freelensapp/react-application";
import { registerFeature } from "@freelensapp/feature-core";
import { createContainer } from "@ogre-tools/injectable";

const di = createContainer("some-container");

registerFeature(di, reactApplicationRootFeature);
```

## Extendability
