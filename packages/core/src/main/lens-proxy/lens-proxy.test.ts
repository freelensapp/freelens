/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import getClusterForRequestInjectable from "./get-cluster-for-request.injectable";
import lensProxyInjectable from "./lens-proxy.injectable";
import kubeApiUpgradeRequestInjectable from "./proxy-functions/kube-api-upgrade-request.injectable";
import shellApiRequestInjectable from "./proxy-functions/shell-api-request.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { Cluster } from "../../common/cluster/cluster";
import type { ServerIncomingMessage } from "./lens-proxy";

/**
 * The certificate is a placeholder in unit tests and the real RSA keygen is
 * mocked away, so the TLS server cannot be created. Nothing here needs TLS:
 * the upgrade handler is registered on the server object, which a plain http
 * server models exactly.
 */
vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:https")>();
  const http = await import("node:http");
  const createServer = (_options: unknown, handler: Parameters<typeof http.createServer>[1]) =>
    http.createServer(handler);

  return { ...actual, createServer, default: { ...actual, createServer } };
});

describe("lens proxy upgrade requests", () => {
  let di: DiContainer;
  let cluster: Cluster | undefined;
  let shellApiRequest: Mock;
  let kubeApiUpgradeRequest: Mock;
  let socket: { destroy: Mock };

  const upgrade = (url: string) => {
    const proxy = di.inject(lensProxyInjectable);
    // The upgrade handler is what is under test, and it runs long before the
    // server is listening.
    const server = (proxy as unknown as { proxyServer: NodeJS.EventEmitter }).proxyServer;

    server.emit("upgrade", { url, method: "GET", headers: {} } as ServerIncomingMessage, socket, Buffer.from([]));
  };

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");

    cluster = { id: "some-cluster-id" } as Cluster;
    shellApiRequest = vi.fn();
    kubeApiUpgradeRequest = vi.fn();
    socket = { destroy: vi.fn() };

    di.override(getClusterForRequestInjectable, () => () => cluster);
    di.override(shellApiRequestInjectable, () => shellApiRequest);
    di.override(kubeApiUpgradeRequestInjectable, () => kubeApiUpgradeRequest);
  });

  describe("when there is a cluster for the request", () => {
    it("routes an internal request to the shell api", () => {
      upgrade("/api?id=some-tab-id");

      expect(shellApiRequest).toHaveBeenCalledTimes(1);
      expect(kubeApiUpgradeRequest).not.toHaveBeenCalled();
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it("routes anything else to the kube api, with the cluster", () => {
      upgrade("/api-kube/api/v1/namespaces/default/pods/some-pod/exec");

      expect(kubeApiUpgradeRequest).toHaveBeenCalledWith(expect.objectContaining({ cluster }));
      expect(shellApiRequest).not.toHaveBeenCalled();
      expect(socket.destroy).not.toHaveBeenCalled();
    });
  });

  describe("when there is no cluster for the request", () => {
    beforeEach(() => {
      cluster = undefined;
    });

    it("still routes an internal request to the shell api, without a cluster", () => {
      upgrade("/api?id=some-tab-id&type=standalone");

      expect(shellApiRequest).toHaveBeenCalledWith(expect.objectContaining({ cluster: undefined }));
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it("destroys any other upgrade request", () => {
      upgrade("/api-kube/api/v1/namespaces/default/pods/some-pod/exec");

      expect(socket.destroy).toHaveBeenCalledTimes(1);
      expect(kubeApiUpgradeRequest).not.toHaveBeenCalled();
      expect(shellApiRequest).not.toHaveBeenCalled();
    });
  });
});
