/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { dumpYaml, KubeConfig } from "@kubernetes/client-node";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { loadConfigFromString } from "./kube-helpers";

const kubeconfig = `
apiVersion: v1
kind: Config
current-context: context-a
clusters:
  - name: cluster-a
    cluster:
      server: https://a.example.test:6443
      certificate-authority-data: Y2E=
      tls-server-name: a.internal
      proxy-url: http://proxy.example.test:3128
  - name: cluster-b
    cluster:
      server: https://b.example.test
      insecure-skip-tls-verify: true
users:
  - name: user-a
    user:
      token: some-token
  - name: user-b
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1
        command: some-credential-plugin
        args: ["--flag"]
contexts:
  - name: context-a
    context:
      cluster: cluster-a
      user: user-a
      namespace: namespace-a
  - name: context-b
    context:
      cluster: cluster-b
      user: user-b
`;

// The same kubeconfig as the client of @kubernetes/client-node holds it.
const load = () => {
  const { config } = loadConfigFromString(kubeconfig);
  const client = new KubeConfig();

  client.loadFromOptions({
    clusters: structuredClone(config.clusters),
    users: structuredClone(config.users),
    contexts: structuredClone(config.contexts),
    currentContext: config.currentContext,
  });

  return { config, client };
};

describe("KubeConfigData, as the KubeConfig of @kubernetes/client-node", () => {
  it("finds contexts, clusters and users the same way", () => {
    const { config, client } = load();

    expect(config.getContexts()).toEqual(client.getContexts());
    expect(config.getClusters()).toEqual(client.getClusters());
    expect(config.getUsers()).toEqual(client.getUsers());
    expect(config.getCurrentContext()).toBe(client.getCurrentContext());

    for (const name of ["context-a", "context-b", "missing"]) {
      expect(config.getContextObject(name)).toEqual(client.getContextObject(name));
    }

    for (const name of ["cluster-a", "cluster-b", "missing"]) {
      expect(config.getCluster(name)).toEqual(client.getCluster(name));
    }

    for (const name of ["user-a", "user-b", "missing"]) {
      expect(config.getUser(name)).toEqual(client.getUser(name));
    }
  });

  it("refuses a duplicate the same way", () => {
    const { config, client } = load();

    expect(() => config.addCluster({ name: "cluster-a", server: "https://other.example.test" } as never)).toThrow(
      "Duplicate cluster: cluster-a",
    );
    expect(() => client.addCluster({ name: "cluster-a", server: "https://other.example.test" } as never)).toThrow(
      "Duplicate cluster: cluster-a",
    );
    expect(() => config.addUser({ name: "user-a" } as never)).toThrow("Duplicate user: user-a");
    expect(() => config.addContext({ name: "context-a" } as never)).toThrow("Duplicate context: context-a");
  });

  it("exports the same JSON, and writes the same YAML as dumpYaml", () => {
    const { config, client } = load();

    expect(config.exportConfig()).toBe(client.exportConfig());
    expect(yaml.dump(JSON.parse(config.exportConfig()))).toBe(dumpYaml(JSON.parse(client.exportConfig())));
  });
});
