import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable, showShortInfoNotificationInjectable } from "@freelensapp/notifications";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import isExtensionEnabledInjectable from "../../../features/extensions/enabled/common/is-enabled.injectable";
import { LensProtocolRouterRenderer } from "./lens-protocol-router-renderer";

const lensProtocolRouterRendererInjectable = getInjectable({
  id: "lens-protocol-router-renderer",

  instantiate: (di) =>
    new LensProtocolRouterRenderer({
      extensionLoader: di.inject(extensionLoaderInjectable),
      isExtensionEnabled: di.inject(isExtensionEnabledInjectable),
      logger: di.inject(loggerInjectionToken),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
      showShortInfoNotification: di.inject(showShortInfoNotificationInjectable),
    }),
});

export default lensProtocolRouterRendererInjectable;
