# @freelensapp/application-for-electron-main

This Feature extends `@freelensapp/application` with Electron specifics.

## Usage
```sh
npm install @freelensapp/application-for-electron-main
```

```typescript
import { applicationFeature, startApplicationInjectionToken } from "@freelensapp/application";
import { applicationFeatureForElectronMain } from "@freelensapp/application-for-electron-main";
import { registerFeature } from "@freelensapp/feature-core";
import { createContainer } from "@ogre-tools/injectable";

const di = createContainer("some-container");

registerFeature(di, applicationFeature, applicationFeatureForElectronMain);

const startApplication = di.inject(startApplicationInjectionToken);

startApplication();
```

## Extendability

### Timeslots

#### `beforeAnythingInjectionToken`

Runnables registered here will be called before anything else. **Special requirement** here is that everything here needs to be synchronous.

#### `beforeElectronIsReadyInjectionToken`

Runnables registered here will be called right after runnables in `beforeAnythingInjectionToken` but still before we are sure that Electron application is ready (`electron.app.whenReady()`). **Special requirement** here is that everything here needs to be synchronous.
