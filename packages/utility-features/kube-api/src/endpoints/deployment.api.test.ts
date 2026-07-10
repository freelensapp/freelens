/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeJsonApi } from "../kube-json-api";
import { DeploymentApi } from "./deployment.api";

import type { Mocked } from "vitest";

describe("DeploymentApi", () => {
  let deploymentApi: DeploymentApi;
  let kubeJsonApi: Mocked<KubeJsonApi>;

  beforeEach(() => {
    kubeJsonApi = {
      getResponse: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      del: vi.fn(),
    } as never;

    deploymentApi = new DeploymentApi({
      logDebug: vi.fn(),
      logError: vi.fn(),
      logInfo: vi.fn(),
      logWarn: vi.fn(),
      maybeKubeApi: kubeJsonApi,
    });
  });

  describe("scale", () => {
    it("requests Kubernetes API with PATCH verb and correct amount of replicas", async () => {
      await deploymentApi.scale({ namespace: "default", name: "deployment-1" }, 5);

      expect(kubeJsonApi.patch).toHaveBeenCalledWith(
        "/apis/apps/v1/namespaces/default/deployments/deployment-1/scale",
        {
          data: {
            spec: {
              replicas: 5,
            },
          },
        },
        {
          headers: {
            "content-type": "application/merge-patch+json",
          },
        },
      );
    });
  });
});
