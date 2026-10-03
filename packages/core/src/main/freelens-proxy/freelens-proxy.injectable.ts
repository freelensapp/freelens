/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { createProxyServer } from "http-proxy-3";
import emitAppEventInjectable from "../../common/app-event-bus/emit-event.injectable";
import freelensProxyCertificateInjectable from "../../common/certificate/freelens-proxy-certificate.injectable";
import contentSecurityPolicyInjectable from "../../common/vars/content-security-policy.injectable";
import kubeAuthProxyServerInjectable from "../cluster/kube-auth-proxy-server.injectable";
import routerInjectable from "../router/router.injectable";
import { FreelensProxy } from "./freelens-proxy";
import freelensProxyPortInjectable from "./freelens-proxy-port.injectable";
import getClusterForRequestInjectable from "./get-cluster-for-request.injectable";
import kubeApiUpgradeRequestInjectable from "./proxy-functions/kube-api-upgrade-request.injectable";
import shellApiRequestInjectable from "./proxy-functions/shell-api-request.injectable";

const freelensProxyInjectable = getInjectable({
  id: "freelens-proxy",

  instantiate: (di) =>
    new FreelensProxy({
      router: di.inject(routerInjectable),
      proxy: createProxyServer(),
      kubeApiUpgradeRequest: di.inject(kubeApiUpgradeRequestInjectable),
      shellApiRequest: di.inject(shellApiRequestInjectable),
      getClusterForRequest: di.inject(getClusterForRequestInjectable),
      freelensProxyPort: di.inject(freelensProxyPortInjectable),
      contentSecurityPolicy: di.inject(contentSecurityPolicyInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      logger: di.inject(loggerInjectionToken),
      certificate: di.inject(freelensProxyCertificateInjectable).get(),
      getKubeAuthProxyServer: (cluster) => di.inject(kubeAuthProxyServerInjectable, cluster),
    }),
});

export default freelensProxyInjectable;
