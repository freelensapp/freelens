/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { randomBytes } from "node:crypto";
import { once } from "node:events";
import http2 from "node:http2";
import https from "node:https";
import { loggerInjectionToken } from "@freelensapp/logger";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { Agent } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import freelensProxyCertificateInjectable from "../../common/certificate/freelens-proxy-certificate.injectable";
import randomBytesInjectable from "../../common/utils/random-bytes.injectable";
import { aiApprovalRequestChannel, aiApprovalResolvedChannel } from "../../features/ai-tools/common/ai-tools";
import aiApprovalsInjectable from "../../features/ai-tools/main/ai-approvals.injectable";
import aiSessionsInjectable from "../../features/ai-tools/main/ai-sessions.injectable";
import { testCertificate } from "../../test-utils/test-certificate";
import freelensK8sProxyManagerInjectable from "../cluster/freelens-k8s-proxy-manager.injectable";
import { apiTargetOptions, createFreelensK8sProxyAgent, dispatcherFor } from "../cluster/freelens-k8s-proxy-target";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import freelensProxyInjectable from "./freelens-proxy.injectable";
import freelensProxyPortInjectable from "./freelens-proxy-port.injectable";
import freelensProxyTokenInjectable from "./freelens-proxy-token.injectable";
import getClusterForRequestInjectable from "./get-cluster-for-request.injectable";
import kubeApiUpgradeRequestInjectable from "./proxy-functions/kube-api-upgrade-request.injectable";
import shellApiRequestInjectable from "./proxy-functions/shell-api-request.injectable";
import type net from "node:net";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { Cluster } from "../../common/cluster/cluster";
import type { AiApprovalRequest } from "../../features/ai-tools/common/ai-tools";
import type { FreelensK8sProxyManager } from "../cluster/freelens-k8s-proxy-manager.injectable";
import type { ServerIncomingMessage } from "./freelens-proxy";

/**
 * The requests of an AI assistant, through the real proxy, to a fake API
 * server: reads go through, everything else waits for the user.
 */
describe("Freelens proxy with an AI session token", () => {
  let di: DiContainer;
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let target: http2.Http2SecureServer;
  let targetReceived: { method: string; url: string }[];
  let agent: Agent;
  let approvalRequests: AiApprovalRequest[];
  let resolvedIds: string[];
  let sendMessageToChannel: Mock;
  let kubeApiUpgradeRequest: Mock;
  let shellApiRequest: Mock;

  const request = (method: string, path: string, token: string, body?: string) =>
    new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      const req = https.request(
        {
          host: "127.0.0.1",
          port,
          path,
          method,
          agent: false,
          rejectUnauthorized: false,
          // As kubectl sends a body: with its length.
          headers: {
            authorization: `Bearer ${token}`,
            ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}),
          },
        },
        (res) => {
          let text = "";

          res.setEncoding("utf8");
          res.on("data", (chunk: string) => (text += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode, body: text }));
        },
      );

      req.on("error", reject);
      req.end(body);
    });

  const nextApprovalRequest = () => vi.waitFor(() => approvalRequests.at(-1) ?? Promise.reject(new Error("none")));

  const emitUpgrade = (url: string, token: string) => {
    const socket = { destroyed: false, end: vi.fn(), destroy: vi.fn(), on: vi.fn() } as unknown as net.Socket;
    const server = (proxy as unknown as { proxyServer: NodeJS.EventEmitter }).proxyServer;

    server.emit(
      "upgrade",
      {
        url,
        method: "GET",
        headers: { host: `127.0.0.1:${port}`, authorization: `Bearer ${token}` },
      } as unknown as ServerIncomingMessage,
      socket,
      Buffer.from([]),
    );

    return socket;
  };

  beforeEach(async () => {
    di = getDiForUnitTesting();
    targetReceived = [];
    approvalRequests = [];
    resolvedIds = [];

    target = http2.createSecureServer(
      { key: testCertificate.private, cert: testCertificate.cert, allowHTTP1: true },
      (req, res) => {
        targetReceived.push({ method: req.method, url: req.url });
        req.resume();
        req.on("end", () => res.end(`${req.method} ${req.url}`));
      },
    );
    target.listen(0, "127.0.0.1");
    await once(target, "listening");

    const { port: targetPort } = target.address() as net.AddressInfo;

    agent = createFreelensK8sProxyAgent(testCertificate.cert);
    sendMessageToChannel = vi.fn((channel: { id: string }, message: unknown) => {
      if (channel.id === aiApprovalRequestChannel.id) approvalRequests.push(message as AiApprovalRequest);
      if (channel.id === aiApprovalResolvedChannel.id) resolvedIds.push(message as string);
    });
    kubeApiUpgradeRequest = vi.fn();
    shellApiRequest = vi.fn();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
    di.override(freelensProxyCertificateInjectable, () => ({ get: () => testCertificate, set: () => {} }));
    di.override(sendMessageToChannelInjectionToken, () => sendMessageToChannel);
    // The global override of the unit tests returns the same bytes every
    // time, which would make every token the same.
    di.override(randomBytesInjectable, () => randomBytes);
    di.override(getClusterForRequestInjectable, () => (req) => {
      for (const id of ["cluster-a", "cluster-b"]) {
        if (req.url?.startsWith(`/${id}/`)) {
          req.url = req.url.replace(`/${id}`, "/api-kube");

          return { id, name: { get: () => `name-of-${id}` }, disconnected: { get: () => false } } as unknown as Cluster;
        }
      }

      return undefined;
    });
    di.override(shellApiRequestInjectable, () => shellApiRequest);
    di.override(kubeApiUpgradeRequestInjectable, () => kubeApiUpgradeRequest);
    di.override(
      freelensK8sProxyManagerInjectable,
      () =>
        ({
          getApiTarget: async () =>
            apiTargetOptions({
              target: new URL(`https://127.0.0.1:${targetPort}`),
              dispatcher: dispatcherFor(agent),
            }),
        }) as unknown as FreelensK8sProxyManager,
    );
    di.override(loggerInjectionToken, () => ({
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
    }));

    proxy = di.inject(freelensProxyInjectable);
    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(async () => {
    await proxy.close();
    await agent.destroy();
    target.close();
  });

  const issue = (clusterId = "cluster-a") =>
    di.inject(aiSessionsInjectable).issue({ providerName: "Claude Code", clusterId }).token;

  it("lets reads of its cluster through without asking", async () => {
    const token = issue();

    expect(await request("GET", "/cluster-a/api/v1/namespaces/shop/pods", token)).toEqual({
      statusCode: 200,
      body: "GET /api/v1/namespaces/shop/pods",
    });
    expect(await request("GET", "/cluster-a/apis/apps/v1/deployments?watch=true", token)).toMatchObject({
      statusCode: 200,
    });
    expect(approvalRequests).toEqual([]);
  });

  it("forwards an approved kubectl delete with its DeleteOptions body", async () => {
    const token = issue();
    const response = request(
      "DELETE",
      "/cluster-a/api/v1/namespaces/shop/pods/web-1",
      token,
      '{"kind":"DeleteOptions","apiVersion":"v1","propagationPolicy":"Background"}',
    );

    di.inject(aiApprovalsInjectable).decide((await nextApprovalRequest()).id, true);

    expect(await response).toEqual({ statusCode: 200, body: "DELETE /api/v1/namespaces/shop/pods/web-1" });
  });

  it("answers kubectl auth can-i and server-side dry runs without asking", async () => {
    const token = issue();

    expect(
      await request("POST", "/cluster-a/apis/authorization.k8s.io/v1/selfsubjectaccessreviews", token, "{}"),
    ).toMatchObject({ statusCode: 200 });
    expect(await request("DELETE", "/cluster-a/api/v1/namespaces/shop/pods/web-1?dryRun=All", token)).toMatchObject({
      statusCode: 200,
    });
    expect(approvalRequests).toEqual([]);
  });

  it("holds a delete until the user approves it, then forwards it once", async () => {
    const token = issue();
    const response = request("DELETE", "/cluster-a/api/v1/namespaces/shop/pods/web-1", token);
    const approval = await nextApprovalRequest();

    expect(approval).toMatchObject({
      providerName: "Claude Code",
      clusterName: "name-of-cluster-a",
      action: "delete pods web-1 in namespace shop",
      reason: "mutation",
      method: "DELETE",
      path: "/api/v1/namespaces/shop/pods/web-1",
    });
    expect(targetReceived).toEqual([]);

    di.inject(aiApprovalsInjectable).decide(approval.id, true);

    expect(await response).toEqual({ statusCode: 200, body: "DELETE /api/v1/namespaces/shop/pods/web-1" });
    expect(resolvedIds).toEqual([approval.id]);

    // The approval was for that request only.
    const again = request("DELETE", "/cluster-a/api/v1/namespaces/shop/pods/web-1", token);

    await vi.waitFor(() => expect(approvalRequests).toHaveLength(2));
    di.inject(aiApprovalsInjectable).decide(approvalRequests[1].id, false);
    expect((await again).statusCode).toBe(403);
    expect(targetReceived).toHaveLength(1);
  });

  it.each([
    [
      "scales a deployment",
      "PATCH",
      "/cluster-a/apis/apps/v1/namespaces/shop/deployments/web/scale",
      "patch deployments.apps web (scale) in namespace shop",
    ],
    ["creates a pod", "POST", "/cluster-a/api/v1/namespaces/shop/pods", "create pods in namespace shop"],
    [
      "replaces a configmap",
      "PUT",
      "/cluster-a/api/v1/namespaces/shop/configmaps/app",
      "replace configmaps app in namespace shop",
    ],
    [
      "deletes every pod of a namespace",
      "DELETE",
      "/cluster-a/api/v1/namespaces/shop/pods",
      "delete all pods in namespace shop",
    ],
    [
      "evicts a pod (kubectl drain)",
      "POST",
      "/cluster-a/api/v1/namespaces/shop/pods/web-1/eviction",
      "create pods web-1 (eviction) in namespace shop",
    ],
    ["deletes a namespace", "DELETE", "/cluster-a/api/v1/namespaces/shop", "delete namespaces shop"],
    ["reads a secret", "GET", "/cluster-a/api/v1/namespaces/shop/secrets/db", "read secrets db in namespace shop"],
  ])("refuses when the user denies: %s", async (_name, method, path, action) => {
    const token = issue();
    const response = request(method, path, token, method === "GET" ? undefined : "{}");
    const approval = await nextApprovalRequest();

    expect(approval.action).toBe(action);

    di.inject(aiApprovalsInjectable).decide(approval.id, false);

    const { statusCode, body } = await response;

    expect(statusCode).toBe(403);
    expect(JSON.parse(body)).toMatchObject({ kind: "Status", reason: "Forbidden", code: 403 });
    expect(JSON.parse(body).message).toContain("did not approve");
    expect(targetReceived).toEqual([]);
  });

  it("denies a request nobody answers once the approval times out", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    try {
      const token = issue();
      const response = request("DELETE", "/cluster-a/api/v1/namespaces/shop/pods/web-1", token);

      const approval = await nextApprovalRequest();

      await vi.advanceTimersByTimeAsync(2 * 60 * 1000 + 1);

      expect((await response).statusCode).toBe(403);
      // The prompt is withdrawn from the window too.
      expect(resolvedIds).toEqual([approval.id]);
      expect(targetReceived).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses another cluster, and the local router api, without asking", async () => {
    const token = issue("cluster-a");

    expect((await request("GET", "/cluster-b/api/v1/pods", token)).statusCode).toBe(403);
    expect((await request("GET", "/api/v2/releases", token)).statusCode).toBe(403);
    expect(approvalRequests).toEqual([]);
    expect(targetReceived).toEqual([]);
  });

  it("refuses a revoked or made-up token", async () => {
    const sessions = di.inject(aiSessionsInjectable);
    const session = sessions.issue({ providerName: "Codex", clusterId: "cluster-a" });

    sessions.revoke(session.id);

    expect((await request("GET", "/cluster-a/api/v1/pods", session.token)).statusCode).toBe(403);
    expect((await request("GET", "/cluster-a/api/v1/pods", "0".repeat(64))).statusCode).toBe(403);
  });

  it("does not change what the proxy's own token may do", async () => {
    const token = di.inject(freelensProxyTokenInjectable).value;

    expect(await request("DELETE", "/cluster-a/api/v1/namespaces/shop/pods/web-1", token)).toMatchObject({
      statusCode: 200,
    });
    expect(approvalRequests).toEqual([]);
  });

  it("holds kubectl exec until approved, and never opens a shell", async () => {
    const token = issue();
    const socket = emitUpgrade("/cluster-a/api/v1/namespaces/shop/pods/web-1/exec?command=sh&stdin=true", token);
    const approval = await nextApprovalRequest();

    expect(approval).toMatchObject({ reason: "interactive", action: "exec pods web-1 in namespace shop" });
    expect(kubeApiUpgradeRequest).not.toHaveBeenCalled();

    di.inject(aiApprovalsInjectable).decide(approval.id, false);

    await vi.waitFor(() => expect(socket.end).toHaveBeenCalledWith(expect.stringContaining("403 Forbidden")));
    expect(kubeApiUpgradeRequest).not.toHaveBeenCalled();

    const shell = emitUpgrade("/api?shellToken=x", token);

    await vi.waitFor(() => expect(shell.end).toHaveBeenCalledWith(expect.stringContaining("403 Forbidden")));
    expect(shellApiRequest).not.toHaveBeenCalled();
  });

  it("forwards kubectl exec once approved", async () => {
    const token = issue();

    emitUpgrade("/cluster-a/api/v1/namespaces/shop/pods/web-1/exec?command=ls", token);
    di.inject(aiApprovalsInjectable).decide((await nextApprovalRequest()).id, true);

    await vi.waitFor(() => expect(kubeApiUpgradeRequest).toHaveBeenCalledTimes(1));
    expect(kubeApiUpgradeRequest.mock.calls[0][0].cluster.id).toBe("cluster-a");
  });
});
