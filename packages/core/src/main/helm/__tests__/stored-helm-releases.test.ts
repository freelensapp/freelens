/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import k8sRequestInjectable from "../../k8s-request.injectable";
import { coalesceValues } from "../helm-service/get-helm-release-values.injectable";
import requestStoredHelmReleasesInjectable from "../request-stored-helm-releases.injectable";

const helmEncode = (release: object, gzip = true) => {
  const json = Buffer.from(JSON.stringify(release));

  return (gzip ? gzipSync(json) : json).toString("base64");
};
const secret = (release: object, gzip = true) => ({
  data: { release: Buffer.from(helmEncode(release, gzip)).toString("base64") },
});
const configMap = (release: object) => ({ data: { release: helmEncode(release) } });

describe("reading helm releases from their secrets and configmaps", () => {
  it("decodes the releases and keeps the latest revision of each", async () => {
    const di = getDiForUnitTesting();
    const k8sRequest = vi.fn(async (_cluster: unknown, path: string) => ({
      items: path.includes("/secrets?")
        ? [
            secret({ name: "a", namespace: "ns", version: 2 }),
            secret({ name: "a", namespace: "ns", version: 3 }, false),
            secret({ name: "b", namespace: "ns", version: 1 }),
            {},
          ]
        : [
            configMap({ name: "a", namespace: "ns", version: 4 }),
            configMap({ name: "c", namespace: "ns", version: 1 }),
          ],
    }));

    di.override(k8sRequestInjectable, () => k8sRequest);

    const releases = await di.inject(requestStoredHelmReleasesInjectable)({ id: "some-cluster" }, "ns", "a");

    expect(k8sRequest).toHaveBeenCalledWith(
      { id: "some-cluster" },
      `/api/v1/namespaces/ns/secrets?labelSelector=${encodeURIComponent("owner=helm,status!=superseded,name=a")}`,
    );
    expect(k8sRequest).toHaveBeenCalledWith(
      { id: "some-cluster" },
      `/api/v1/namespaces/ns/configmaps?labelSelector=${encodeURIComponent("owner=helm,status!=superseded,name=a")}`,
    );
    expect(releases).toEqual([
      { name: "a", namespace: "ns", version: 4 },
      { name: "b", namespace: "ns", version: 1 },
      { name: "c", namespace: "ns", version: 1 },
    ]);
  });

  it("still returns the secrets when the configmaps cannot be read", async () => {
    const di = getDiForUnitTesting();

    di.override(k8sRequestInjectable, () => async (_cluster, path) => {
      if (path.startsWith("/api/v1/configmaps")) {
        throw new Error("forbidden");
      }

      return { items: [secret({ name: "a", namespace: "ns", version: 1 })] };
    });

    expect(await di.inject(requestStoredHelmReleasesInjectable)({ id: "some-cluster" })).toEqual([
      { name: "a", namespace: "ns", version: 1 },
    ]);
  });

  it("merges the chart defaults under the user values like helm get values --all", () => {
    const user = { replicas: 3, image: { tag: "2.0" }, removed: null, list: [1] };
    const defaults = {
      replicas: 1,
      image: { tag: "1.0", pullPolicy: "Always" },
      removed: "x",
      list: [2, 3],
      extra: true,
    };

    expect(coalesceValues(user, defaults)).toEqual({
      replicas: 3,
      image: { tag: "2.0", pullPolicy: "Always" },
      list: [1],
      extra: true,
    });
  });
});
