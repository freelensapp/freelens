/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { getInjectable } from "@ogre-tools/injectable";
import fetchInjectable from "../../common/fetch/fetch.injectable";
import getBasenameOfPathInjectable from "../../common/path/get-basename.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import updateExtensionsStateInjectable from "../../features/extensions/enabled/common/update-state.injectable";
import { extensionEntryPointNameInjectionToken } from "./entry-point-name";
import extensionInjectable from "./extension/extension.injectable";
import extensionInstancesInjectable from "./extension-instances.injectable";
import { ExtensionLoader } from "./extension-loader";

const extensionLoaderInjectable = getInjectable({
  id: "extension-loader",

  instantiate: (di) =>
    new ExtensionLoader({
      updateExtensionsState: di.inject(updateExtensionsStateInjectable),
      extensionInstances: di.inject(extensionInstancesInjectable),
      getExtension: (instance) => di.inject(extensionInjectable, instance),
      extensionEntryPointName: di.inject(extensionEntryPointNameInjectionToken),
      logger: di.inject(loggerInjectionToken),
      getRandomId: di.inject(getRandomIdInjectionToken),
      joinPaths: di.inject(joinPathsInjectable),
      getBasenameOfPath: di.inject(getBasenameOfPathInjectable),
      fetch: di.inject(fetchInjectable),
    }),
});

export default extensionLoaderInjectable;
