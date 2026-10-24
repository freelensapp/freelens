/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { once } from "node:events";
import { PassThrough } from "node:stream";
import tls from "node:tls";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../../common/cluster/cluster";
import clusterApiUrlInjectable from "../../../features/cluster/connections/main/api-url.injectable";
import { testCertificate } from "../../../test-utils/test-certificate";
import freelensK8sProxyManagerInjectable from "../../cluster/freelens-k8s-proxy-manager.injectable";
import freelensK8sProxyCertificateInjectable from "../../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeApiUpgradeRequestInjectable from "./kube-api-upgrade-request.injectable";
import type net from "node:net";

import type { FreelensK8sProxyManager } from "../../cluster/freelens-k8s-proxy-manager.injectable";
import type { FreelensProxyApiRequest } from "../freelens-proxy";
import type { ProxyApiRequestArgs } from "./types";

describe("kube api upgrade requests", () => {
  let kubeApiUpgradeRequest: FreelensProxyApiRequest;
  let target: tls.Server;
  let targetConnection: Promise<tls.TLSSocket>;
  let client: PassThrough;

  const cluster = new Cluster({
    id: "some-cluster-id",
    kubeConfigPath: "/some/kube-config",
    contextName: "some-context-name",
  });

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    // freelens-k8s-proxy, which offers HTTP/2 first
    target = tls.createServer({
      key: testCertificate.private,
      cert: testCertificate.cert,
      ALPNProtocols: ["h2", "http/1.1"],
    });
    targetConnection = once(target, "secureConnection").then(([socket]) => socket as tls.TLSSocket);
    target.listen(0, "127.0.0.1");
    await once(target, "listening");

    const { port } = target.address() as net.AddressInfo;

    di.override(clusterApiUrlInjectable, () => async () => new URL("https://some-api-server:6443"));
    di.override(freelensK8sProxyCertificateInjectable, () => Promise.resolve(testCertificate));
    di.override(
      freelensK8sProxyManagerInjectable,
      () =>
        ({
          ensureFreelensK8sProxyUrl: async () => `https://127.0.0.1:${port}/some-api-prefix`,
        }) as unknown as FreelensK8sProxyManager,
    );

    kubeApiUpgradeRequest = di.inject(kubeApiUpgradeRequestInjectable);
    // The socket of the client, upgraded by freelens-proxy
    client = Object.assign(new PassThrough(), { setKeepAlive: vi.fn(), setTimeout: vi.fn() });
  });

  afterEach(() => {
    client.destroy();
    target.close();
  });

  it("opens an HTTP/1.1 connection to freelens-k8s-proxy, not offering HTTP/2, and writes the request to it", async () => {
    await kubeApiUpgradeRequest({
      req: {
        method: "GET",
        url: "/api-kube/api/v1/namespaces/default/pods/some-pod/exec",
        httpVersion: "1.1",
        rawHeaders: ["Host", "127.0.0.1", "Connection", "Upgrade", "Upgrade", "SPDY/3.1"],
      } as ProxyApiRequestArgs["req"],
      socket: client as unknown as net.Socket,
      head: Buffer.from([]),
      cluster,
    });

    const connection = await targetConnection;
    let request = "";

    while (!request.includes("\r\n\r\n")) {
      const [chunk] = (await once(connection, "data")) as [Buffer];

      request += chunk.toString();
    }

    expect(connection.alpnProtocol).toBe(false);
    expect(request).toBe(
      [
        "GET /some-api-prefix/api/v1/namespaces/default/pods/some-pod/exec HTTP/1.1",
        "Host: some-api-server:6443",
        "Connection: Upgrade",
        "Upgrade: SPDY/3.1",
        "",
        "",
      ].join("\r\n"),
    );

    connection.end("HTTP/1.1 101 Switching Protocols\r\n\r\n");

    const [response] = (await once(client, "data")) as [Buffer];

    expect(response.toString()).toBe("HTTP/1.1 101 Switching Protocols\r\n\r\n");
  });

  it("does not carry the proxy token or the frame origin to the cluster, whatever the header case", async () => {
    await kubeApiUpgradeRequest({
      req: {
        method: "GET",
        url: "/api-kube/api/v1/namespaces/default/pods/some-pod/exec",
        httpVersion: "1.1",
        rawHeaders: [
          "Host",
          "127.0.0.1",
          "cookie",
          "freelens_proxy_token=some-secret",
          "Authorization",
          "Bearer some-secret",
          "Origin",
          "https://some-cluster-id.renderer.freelens.app",
          "Connection",
          "Upgrade",
          "Upgrade",
          "SPDY/3.1",
        ],
      } as ProxyApiRequestArgs["req"],
      socket: client as unknown as net.Socket,
      head: Buffer.from([]),
      cluster,
    });

    const connection = await targetConnection;
    let request = "";

    while (!request.includes("\r\n\r\n")) {
      const [chunk] = (await once(connection, "data")) as [Buffer];

      request += chunk.toString();
    }

    expect(request).not.toMatch(/freelens_proxy_token|some-secret/);
    expect(request.toLowerCase()).not.toMatch(/\r\ncookie:/);
    expect(request.toLowerCase()).not.toMatch(/\r\nauthorization:/);
    expect(request.toLowerCase()).not.toMatch(/\r\norigin:/);
    expect(request).toContain("Connection: Upgrade");
  });
});
