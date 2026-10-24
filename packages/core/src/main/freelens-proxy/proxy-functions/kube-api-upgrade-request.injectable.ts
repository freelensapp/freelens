/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { connect } from "node:tls";
import url from "node:url";
import { getInjectable } from "@ogre-tools/injectable";
import { chunk } from "es-toolkit";
import { apiKubePrefix } from "../../../common/vars";
import clusterApiUrlInjectable from "../../../features/cluster/connections/main/api-url.injectable";
import freelensK8sProxyManagerInjectable from "../../cluster/freelens-k8s-proxy-manager.injectable";
import freelensK8sProxyCertificateInjectable from "../../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";
import type { ConnectionOptions } from "node:tls";

import type { FreelensProxyApiRequest } from "../freelens-proxy";

// Matched case-insensitively below. `authorization` and `cookie` carry the
// freelens-proxy token, which must not travel to the cluster; `host` is set
// from the cluster's API URL instead; `origin` is the frame's, which a cluster
// behind a gateway such as the GitLab agent server refuses.
const skipRawHeaders = new Set(["host", "authorization", "cookie", "origin"]);

const kubeApiUpgradeRequestInjectable = getInjectable({
  id: "kube-api-upgrade-request",
  instantiate:
    (di): FreelensProxyApiRequest =>
    async ({ req, socket, head, cluster }) => {
      const clusterApiUrl = await di.inject(clusterApiUrlInjectable, cluster)();
      const freelensK8sProxyManager = di.inject(freelensK8sProxyManagerInjectable, cluster);
      const freelensK8sProxyCertificate = await di.inject(
        freelensK8sProxyCertificateInjectable,
        clusterApiUrl.hostname,
      );

      const proxyUrl = (await freelensK8sProxyManager.ensureFreelensK8sProxyUrl()) + req.url.replace(apiKubePrefix, "");
      const pUrl = url.parse(proxyUrl);
      /**
       * No `ALPNProtocols`, and above all no `h2` among them: exec, attach
       * and port-forward take over the HTTP/1.1 connection, and the request
       * written below is an HTTP/1.1 one. freelens-k8s-proxy offers `h2`
       * first, so a connection that offered it would be HTTP/2, and the proxy
       * would answer this request line with the preface of an HTTP/2
       * connection. Without ALPN the proxy stays on HTTP/1.1.
       */
      const connectOpts: ConnectionOptions = {
        port: pUrl.port ? parseInt(pUrl.port) : undefined,
        host: pUrl.hostname ?? undefined,
        ca: freelensK8sProxyCertificate.cert,
      };
      const proxySocket = connect(connectOpts);

      proxySocket.once("secureConnect", () => {
        proxySocket.write(`${req.method} ${pUrl.path} HTTP/1.1\r\n`);
        proxySocket.write(`Host: ${clusterApiUrl.host}\r\n`);

        for (const [key, value] of chunk(req.rawHeaders, 2)) {
          if (skipRawHeaders.has(key.toLowerCase())) {
            continue;
          }

          proxySocket.write(`${key}: ${value}\r\n`);
        }

        proxySocket.write("\r\n");
        proxySocket.write(head);
      });

      proxySocket.setKeepAlive(true);
      socket.setKeepAlive(true);
      proxySocket.setTimeout(0);
      socket.setTimeout(0);
      proxySocket.on("data", (chunk) => {
        if (!socket.write(chunk)) {
          proxySocket.pause();
        }
      });
      socket.on("drain", () => {
        proxySocket.resume();
      });
      proxySocket.on("end", () => {
        socket.end();
      });
      proxySocket.on("error", () => {
        socket.write(`HTTP/${req.httpVersion} 500 Connection error\r\n\r\n`);
        socket.end();
      });
      socket.on("data", (chunk) => {
        if (!proxySocket.write(chunk)) {
          socket.pause();
        }
      });
      proxySocket.on("drain", () => {
        socket.resume();
      });
      socket.on("end", () => {
        proxySocket.end();
      });
      socket.on("error", () => {
        proxySocket.end();
      });
    },
});

export default kubeApiUpgradeRequestInjectable;
