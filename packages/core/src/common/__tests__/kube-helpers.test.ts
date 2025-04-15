/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeConfig } from "@freelensapp/kubernetes-client-node";
import { loadConfigFromString, validateKubeConfig } from "../kube-helpers";

const kubeconfig = `
apiVersion: v1
clusters:
- cluster:
    server: https://localhost
  name: test
contexts:
- context:
    cluster: test
    user: test
  name: valid
- context:
    cluster: test2
    user: test
  name: invalidCluster
- context:
    cluster: test
    user: test2
  name: invalidUser
- context:
    cluster: test
    user: invalidExec
  name: invalidExec
current-context: test
kind: Config
preferences: {}
users:
- name: test
  user:
    exec:
      command: echo
- name: invalidExec
  user:
    exec:
      command: foo
`;

interface Kubeconfig {
  apiVersion: string;
  clusters: [
    {
      name: string;
      cluster: {
        server: string;
      };
    },
  ];
  contexts: [
    {
      context: {
        cluster: string;
        user: string;
      };
      name: string;
    },
  ];
  users: [
    {
      name: string;
    },
  ];
  kind: string;
  "current-context": string;
  preferences: {};
}

let mockKubeConfig: Kubeconfig;

describe("kube helpers", () => {
  describe("validateKubeconfig", () => {
    const kc = new KubeConfig();

    beforeAll(() => {
      kc.loadFromString(kubeconfig);
    });
    describe("with default validation options", () => {
      describe("with valid kubeconfig", () => {
        it("does not return an error", () => {
          expect(validateKubeConfig(kc, "valid")).toBeDefined();
        });
      });
      describe("with invalid context object", () => {
        it("returns an error", () => {
          expect(validateKubeConfig(kc, "invalid").error?.toString()).toEqual(
            expect.stringContaining("No valid context object provided in kubeconfig for context 'invalid'"),
          );
        });
      });

      describe("with invalid cluster object", () => {
        it("returns an error", () => {
          expect(validateKubeConfig(kc, "invalidCluster").error?.toString()).toEqual(
            expect.stringContaining("No valid cluster object provided in kubeconfig for context 'invalidCluster'"),
          );
        });
      });

      describe("with invalid user object", () => {
        it("returns an error", () => {
          expect(validateKubeConfig(kc, "invalidUser").error?.toString()).toEqual(
            expect.stringContaining("No valid user object provided in kubeconfig for context 'invalidUser'"),
          );
        });
      });
    });
  });

  describe("pre-validate context object in kubeconfig tests", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("Check logger.error() output", () => {
      it("invalid yaml string", () => {
        const invalidYAMLString = "fancy foo config";

        expect(loadConfigFromString(invalidYAMLString).error).toBeInstanceOf(Error);
      });
      it("empty contexts", () => {
        const emptyContexts = `apiVersion: v1\ncontexts: []`;

        expect(loadConfigFromString(emptyContexts).error).toBeUndefined();
      });
    });

    describe("Check valid kubeconfigs", () => {
      beforeEach(() => {
        mockKubeConfig = {
          apiVersion: "v1",
          clusters: [
            {
              name: "minikube",
              cluster: {
                server: "https://192.168.64.3:8443",
              },
            },
          ],
          contexts: [
            {
              context: {
                cluster: "minikube",
                user: "minikube",
              },
              name: "minikube",
            },
          ],
          users: [
            {
              name: "minikube",
            },
          ],
          kind: "Config",
          "current-context": "minikube",
          preferences: {},
        };
      });

      it("single context is ok", async () => {
        const { config } = loadConfigFromString(JSON.stringify(mockKubeConfig));

        expect(config.getCurrentContext()).toBe("minikube");
      });

      it("multiple context is ok", async () => {
        mockKubeConfig.contexts.push({ context: { cluster: "cluster-2", user: "cluster-2" }, name: "cluster-2" });
        const { config } = loadConfigFromString(JSON.stringify(mockKubeConfig));

        expect(config.getCurrentContext()).toBe("minikube");
        expect(config.contexts.length).toBe(2);
      });
    });

    describe("Check invalid kubeconfigs", () => {
      beforeEach(() => {
        mockKubeConfig = {
          apiVersion: "v1",
          clusters: [
            {
              name: "minikube",
              cluster: {
                server: "https://192.168.64.3:8443",
              },
            },
          ],
          contexts: [
            {
              context: {
                cluster: "minikube",
                user: "minikube",
              },
              name: "minikube",
            },
          ],
          users: [
            {
              name: "minikube",
            },
          ],
          kind: "Config",
          "current-context": "minikube",
          preferences: {},
        };
      });

      it("empty name in context causes it to be removed", async () => {
        mockKubeConfig.contexts.push({ context: { cluster: "cluster-2", user: "cluster-2" }, name: "" });
        expect(mockKubeConfig.contexts.length).toBe(2);
        const { config } = loadConfigFromString(JSON.stringify(mockKubeConfig));

        expect(config.getCurrentContext()).toBe("minikube");
        expect(config.contexts.length).toBe(1);
      });

      it("empty cluster in context causes it to be removed", async () => {
        mockKubeConfig.contexts.push({ context: { cluster: "", user: "cluster-2" }, name: "cluster-2" });
        expect(mockKubeConfig.contexts.length).toBe(2);
        const { config } = loadConfigFromString(JSON.stringify(mockKubeConfig));

        expect(config.getCurrentContext()).toBe("minikube");
        expect(config.contexts.length).toBe(1);
      });

      it("empty user in context causes it to be removed", async () => {
        mockKubeConfig.contexts.push({ context: { cluster: "cluster-2", user: "" }, name: "cluster-2" });
        expect(mockKubeConfig.contexts.length).toBe(2);
        const { config } = loadConfigFromString(JSON.stringify(mockKubeConfig));

        expect(config.getCurrentContext()).toBe("minikube");
        expect(config.contexts.length).toBe(1);
      });

      it("invalid context in between valid contexts is removed", async () => {
        mockKubeConfig.contexts.push({ context: { cluster: "cluster-2", user: "" }, name: "cluster-2" });
        mockKubeConfig.contexts.push({ context: { cluster: "cluster-3", user: "cluster-3" }, name: "cluster-3" });
        expect(mockKubeConfig.contexts.length).toBe(3);
        const { config } = loadConfigFromString(JSON.stringify(mockKubeConfig));

        expect(config.getCurrentContext()).toBe("minikube");
        expect(config.contexts.length).toBe(2);
        expect(config.contexts[0].name).toBe("minikube");
        expect(config.contexts[1].name).toBe("cluster-3");
      });
    });
  });
});
