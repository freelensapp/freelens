/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { KubeJsonApi } from "../kube-json-api";
import { PodApi } from "./pod.api";

it("patches only the new ephemeral container and sends UID and resourceVersion preconditions", async () => {
  const patch = vi.fn().mockResolvedValue({
    apiVersion: "v1",
    kind: "Pod",
    metadata: { name: "app", namespace: "default", uid: "pod-uid", resourceVersion: "43" },
    spec: { containers: [] },
  });
  const api = new PodApi({
    logDebug: vi.fn(),
    logError: vi.fn(),
    logInfo: vi.fn(),
    logWarn: vi.fn(),
    maybeKubeApi: { patch } as unknown as KubeJsonApi,
  });
  const container = { name: "debugger", image: "alpine", targetContainerName: "app" };
  const result = await api.addEphemeralContainer(
    { namespace: "default", name: "app", uid: "pod-uid", resourceVersion: "42" },
    container,
  );
  expect(patch).toHaveBeenCalledWith(
    "/api/v1/namespaces/default/pods/app/ephemeralcontainers",
    {
      data: { metadata: { uid: "pod-uid", resourceVersion: "42" }, spec: { ephemeralContainers: [container] } },
    },
    { headers: { "content-type": "application/strategic-merge-patch+json" } },
  );
  expect(result).toBeInstanceOf(Pod);
});

it("sends uppercase PATCH and preserves a Kubernetes conflict code through the HTTP client", async () => {
  const fetch = vi.fn().mockResolvedValue({
    status: 409,
    text: async () => JSON.stringify({ status: "Failure", reason: "Conflict", message: "Pod was modified", code: 409 }),
  });
  const request = new KubeJsonApi(
    { fetch, logger: { debug: vi.fn() } as never },
    {
      serverAddress: "http://kubernetes",
      apiBase: "",
    },
  );
  const api = new PodApi({
    logDebug: vi.fn(),
    logError: vi.fn(),
    logInfo: vi.fn(),
    logWarn: vi.fn(),
    maybeKubeApi: request,
  });
  await expect(
    api.addEphemeralContainer(
      { namespace: "default", name: "app", uid: "uid", resourceVersion: "42" },
      { name: "debugger", image: "alpine" },
    ),
  ).rejects.toMatchObject({ code: 409 });
  expect(fetch).toHaveBeenCalledWith(
    "http://kubernetes/api/v1/namespaces/default/pods/app/ephemeralcontainers",
    expect.objectContaining({ method: "PATCH" }),
  );
});
