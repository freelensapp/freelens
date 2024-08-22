# @freelens/application

This package contains stuff related to creating Lens-applications. 

# Usage

```bash
$ npm install @freelens/application-for-electron-main
```

```typescript
import { applicationFeature, startApplicationInjectionToken } from "@freelens/application";
import { registerFeature } from "@freelens/feature-core";
import { createContainer } from "@ogre-tools/injectable";

const di = createContainer("some-container");

registerFeature(di, applicationFeature);

const startApplication = di.inject(startApplicationInjectionToken);

startApplication();
```


## Features

#### Start application
`startApplicationInjectionToken`

Starts the application and calls timeslots in specified order. Check for timeslots for more info.

## Extendability

#### Timeslots

1. `beforeApplicationIsLoadingInjectionToken`
2. `onLoadOfApplicationInjectionToken`
3. `afterApplicationIsLoadedInjectionToken`
