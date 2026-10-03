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
import freelensK8sProxyServerInjectable from "../../cluster/freelens-k8s-proxy-server.injectable";
import freelensK8sProxyCertificateInjectable from "../../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";
import type { ConnectionOptions } from "node:tls";

import type { FreelensProxyApiRequest } from "../freelens-proxy";

const skipRawHeaders = new Set(["Host", "Authorization"]);

const kubeApiUpgradeRequestInjectable = getInjectable({
  id: "kube-api-upgrade-request",
  instantiate:
    (di): FreelensProxyApiRequest =>
    async ({ req, socket, head, cluster }) => {
      const clusterApiUrl = await di.inject(clusterApiUrlInjectable, cluster)();
      const freelensK8sProxyServer = di.inject(freelensK8sProxyServerInjectable, cluster);
      const freelensK8sProxyCertificate = await di.inject(
        freelensK8sProxyCertificateInjectable,
        clusterApiUrl.hostname,
      );

      const proxyUrl = (await freelensK8sProxyServer.ensureFreelensK8sProxyUrl()) + req.url.replace(apiKubePrefix, "");
      const pUrl = url.parse(proxyUrl);
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
          if (skipRawHeaders.has(key)) {
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
