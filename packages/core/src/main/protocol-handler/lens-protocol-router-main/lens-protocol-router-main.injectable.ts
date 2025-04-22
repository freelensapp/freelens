/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import broadcastMessageInjectable from "../../../common/ipc/broadcast-message.injectable";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import isExtensionEnabledInjectable from "../../../features/extensions/enabled/common/is-enabled.injectable";
import showApplicationWindowInjectable from "../../start-main-application/lens-window/show-application-window.injectable";
import { LensProtocolRouterMain } from "./lens-protocol-router-main";

const lensProtocolRouterMainInjectable = getInjectable({
  id: "lens-protocol-router-main",

  instantiate: (di) =>
    new LensProtocolRouterMain({
      extensionLoader: di.inject(extensionLoaderInjectable),
      isExtensionEnabled: di.inject(isExtensionEnabledInjectable),
      showApplicationWindow: di.inject(showApplicationWindowInjectable),
      broadcastMessage: di.inject(broadcastMessageInjectable),
      logger: di.inject(loggerInjectionToken),
    }),
});

export default lensProtocolRouterMainInjectable;
