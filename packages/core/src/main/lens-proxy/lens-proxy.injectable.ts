/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import httpProxy from "http-proxy";
import emitAppEventInjectable from "../../common/app-event-bus/emit-event.injectable";
import lensProxyCertificateInjectable from "../../common/certificate/lens-proxy-certificate.injectable";
import contentSecurityPolicyInjectable from "../../common/vars/content-security-policy.injectable";
import kubeAuthProxyServerInjectable from "../cluster/kube-auth-proxy-server.injectable";
import routerInjectable from "../router/router.injectable";
import getClusterForRequestInjectable from "./get-cluster-for-request.injectable";
import { LensProxy } from "./lens-proxy";
import lensProxyPortInjectable from "./lens-proxy-port.injectable";
import kubeApiUpgradeRequestInjectable from "./proxy-functions/kube-api-upgrade-request.injectable";
import shellApiRequestInjectable from "./proxy-functions/shell-api-request.injectable";

const lensProxyInjectable = getInjectable({
  id: "lens-proxy",

  instantiate: (di) =>
    new LensProxy({
      router: di.inject(routerInjectable),
      proxy: httpProxy.createProxy(),
      kubeApiUpgradeRequest: di.inject(kubeApiUpgradeRequestInjectable),
      shellApiRequest: di.inject(shellApiRequestInjectable),
      getClusterForRequest: di.inject(getClusterForRequestInjectable),
      lensProxyPort: di.inject(lensProxyPortInjectable),
      contentSecurityPolicy: di.inject(contentSecurityPolicyInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      logger: di.inject(loggerInjectionToken),
      certificate: di.inject(lensProxyCertificateInjectable).get(),
      getKubeAuthProxyServer: (cluster) => di.inject(kubeAuthProxyServerInjectable, cluster),
    }),
});

export default lensProxyInjectable;
