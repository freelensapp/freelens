/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

jest.mock("tls", () => ({
  connect: jest.fn(),
}));

import { EventEmitter } from "events";
import { connect } from "tls";
import { Cluster } from "../../common/cluster/cluster";
import { apiKubePrefix } from "../../common/vars";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import kubeAuthProxyServerInjectable from "../cluster/kube-auth-proxy-server.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeAuthProxyCertificateInjectable from "../kube-auth-proxy/kube-auth-proxy-certificate.injectable";
import kubeApiUpgradeRequestInjectable from "../lens-proxy/proxy-functions/kube-api-upgrade-request.injectable";

class MockSocket extends EventEmitter {
  destroyed = false;
  writable = true;
  write = jest.fn(() => true);
  end = jest.fn((_: string) => {
    this.writable = false;
  });
  destroy = jest.fn(() => {
    this.destroyed = true;
    this.writable = false;
  });
  pause = jest.fn();
  resume = jest.fn();
  setKeepAlive = jest.fn();
  setTimeout = jest.fn();
}

const mockConnectImplementation = (proxySocket: MockSocket) =>
  ((..._args: unknown[]) => proxySocket as never) as unknown as typeof connect;

describe("kube api upgrade request", () => {
  it("forwards the upgrade request to the auth proxy", async () => {
    const di = getDiForUnitTesting();
    const connectMock = connect as jest.MockedFunction<typeof connect>;
    const proxySocket = new MockSocket();
    const socket = new MockSocket();
    const head = Buffer.from("buffered-head");
    const cluster = new Cluster({
      contextName: "kind-kind",
      id: "cluster-id",
      kubeConfigPath: "/some-kube-config-path",
    });

    di.override(clusterApiUrlInjectable, () => async () => new URL("https://cluster.example.test"));
    di.override(kubeAuthProxyServerInjectable, () => ({
      getApiTarget: jest.fn(),
      ensureAuthProxyUrl: jest.fn(async () => "https://127.0.0.1:9443/proxy-prefix"),
      restart: jest.fn(),
      ensureRunning: jest.fn(),
      stop: jest.fn(),
    }));
    di.override(kubeAuthProxyCertificateInjectable, () => ({
      cert: "some-cert",
      private: "some-key",
      public: "some-public-key",
    }));

    connectMock.mockImplementation(mockConnectImplementation(proxySocket));

    const handleUpgrade = di.inject(kubeApiUpgradeRequestInjectable);

    await handleUpgrade({
      cluster,
      head,
      req: {
        httpVersion: "1.1",
        method: "POST",
        rawHeaders: [
          "Connection",
          "Upgrade",
          "Upgrade",
          "SPDY/3.1",
          "Host",
          "ignored-host",
          "Authorization",
          "ignored-auth",
        ],
        url: `${apiKubePrefix}/api/v1/namespaces/default/pods/demo/exec?command=tar`,
      } as never,
      socket: socket as never,
    });

    expect(connectMock).toHaveBeenCalledWith({
      ca: "some-cert",
      host: "127.0.0.1",
      port: 9443,
    });

    proxySocket.emit("secureConnect");

    expect(proxySocket.write).toHaveBeenNthCalledWith(
      1,
      "POST /proxy-prefix/api/v1/namespaces/default/pods/demo/exec?command=tar HTTP/1.1\r\n",
    );
    expect(proxySocket.write).toHaveBeenNthCalledWith(2, "Host: cluster.example.test\r\n");
    expect(proxySocket.write).toHaveBeenNthCalledWith(3, "Connection: Upgrade\r\n");
    expect(proxySocket.write).toHaveBeenNthCalledWith(4, "Upgrade: SPDY/3.1\r\n");
    expect(proxySocket.write).toHaveBeenNthCalledWith(5, "\r\n");
    expect(proxySocket.write).toHaveBeenNthCalledWith(6, head);
  });

  it("applies backpressure from the auth proxy socket to the client socket", async () => {
    const di = getDiForUnitTesting();
    const connectMock = connect as jest.MockedFunction<typeof connect>;
    const proxySocket = new MockSocket();
    const socket = new MockSocket();
    const cluster = new Cluster({
      contextName: "kind-kind",
      id: "cluster-id",
      kubeConfigPath: "/some-kube-config-path",
    });

    di.override(clusterApiUrlInjectable, () => async () => new URL("https://cluster.example.test"));
    di.override(kubeAuthProxyServerInjectable, () => ({
      getApiTarget: jest.fn(),
      ensureAuthProxyUrl: jest.fn(async () => "https://127.0.0.1:9443/proxy-prefix"),
      restart: jest.fn(),
      ensureRunning: jest.fn(),
      stop: jest.fn(),
    }));
    di.override(kubeAuthProxyCertificateInjectable, () => ({
      cert: "some-cert",
      private: "some-key",
      public: "some-public-key",
    }));

    connectMock.mockImplementation(mockConnectImplementation(proxySocket));

    const handleUpgrade = di.inject(kubeApiUpgradeRequestInjectable);

    await handleUpgrade({
      cluster,
      head: Buffer.alloc(0),
      req: {
        httpVersion: "1.1",
        method: "POST",
        rawHeaders: [],
        url: `${apiKubePrefix}/api/v1/namespaces/default/pods/demo/exec?command=tar`,
      } as never,
      socket: socket as never,
    });

    proxySocket.emit("secureConnect");
    proxySocket.write.mockClear();
    proxySocket.write.mockReturnValueOnce(false);

    socket.emit("data", Buffer.from("payload"));

    expect(proxySocket.write).toHaveBeenCalledWith(Buffer.from("payload"));
    expect(socket.pause).toHaveBeenCalledTimes(1);

    proxySocket.emit("drain");

    expect(socket.resume).toHaveBeenCalledTimes(1);
  });

  it("returns an http error before the upgraded stream starts", async () => {
    const di = getDiForUnitTesting();
    const connectMock = connect as jest.MockedFunction<typeof connect>;
    const proxySocket = new MockSocket();
    const socket = new MockSocket();
    const cluster = new Cluster({
      contextName: "kind-kind",
      id: "cluster-id",
      kubeConfigPath: "/some-kube-config-path",
    });

    di.override(clusterApiUrlInjectable, () => async () => new URL("https://cluster.example.test"));
    di.override(kubeAuthProxyServerInjectable, () => ({
      getApiTarget: jest.fn(),
      ensureAuthProxyUrl: jest.fn(async () => "https://127.0.0.1:9443/proxy-prefix"),
      restart: jest.fn(),
      ensureRunning: jest.fn(),
      stop: jest.fn(),
    }));
    di.override(kubeAuthProxyCertificateInjectable, () => ({
      cert: "some-cert",
      private: "some-key",
      public: "some-public-key",
    }));

    connectMock.mockImplementation(mockConnectImplementation(proxySocket));

    const handleUpgrade = di.inject(kubeApiUpgradeRequestInjectable);

    await handleUpgrade({
      cluster,
      head: Buffer.alloc(0),
      req: {
        httpVersion: "1.1",
        method: "GET",
        rawHeaders: [],
        url: `${apiKubePrefix}/api/v1/namespaces/default/pods/demo/exec?command=tar`,
      } as never,
      socket: socket as never,
    });

    proxySocket.emit("error", new Error("boom"));

    expect(socket.write).toHaveBeenCalledWith("HTTP/1.1 500 Connection error\r\n\r\n");
    expect(socket.end).toHaveBeenCalledTimes(1);
  });
});
