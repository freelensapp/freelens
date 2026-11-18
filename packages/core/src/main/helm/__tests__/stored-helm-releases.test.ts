/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { gzipSync } from "node:zlib";
import { loggerInjectionToken } from "@freelensapp/logger";
import { describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import k8sRequestInjectable from "../../k8s-request.injectable";
import getHelmReleaseInjectable from "../helm-service/get-helm-release.injectable";
import getClusterHelmReleaseValuesInjectable, {
  coalesceValues,
} from "../helm-service/get-helm-release-values.injectable";
import listClusterHelmReleasesInjectable from "../helm-service/list-helm-releases.injectable";
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
      `/api/v1/namespaces/ns/secrets?${new URLSearchParams({ labelSelector: "owner=helm,status!=superseded,name=a", limit: "50" })}`,
    );
    expect(k8sRequest).toHaveBeenCalledWith(
      { id: "some-cluster" },
      `/api/v1/namespaces/ns/configmaps?${new URLSearchParams({ labelSelector: "owner=helm,status!=superseded,name=a", limit: "50" })}`,
    );
    expect(releases).toEqual([
      { name: "a", namespace: "ns", version: 4 },
      { name: "b", namespace: "ns", version: 1 },
      { name: "c", namespace: "ns", version: 1 },
    ]);
  });

  it("still returns the secrets when the configmaps cannot be read, and logs it", async () => {
    const di = getDiForUnitTesting();
    const warn = vi.spyOn(di.inject(loggerInjectionToken), "warn");

    di.override(k8sRequestInjectable, () => async (_cluster, path) => {
      if (path.startsWith("/api/v1/configmaps")) {
        throw new Error("forbidden");
      }

      return { items: [secret({ name: "a", namespace: "ns", version: 1 })] };
    });

    expect(await di.inject(requestStoredHelmReleasesInjectable)({ id: "some-cluster" })).toEqual([
      { name: "a", namespace: "ns", version: 1 },
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("cannot read the releases stored in ConfigMaps"),
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it("reads the objects in pages, following the continue token", async () => {
    const di = getDiForUnitTesting();
    const k8sRequest = vi.fn(async (_cluster: unknown, path: string) => {
      if (!path.includes("/secrets?")) {
        return { items: [] };
      }

      return new URLSearchParams(path.split("?")[1]).get("continue") === "page-2"
        ? { metadata: {}, items: [secret({ name: "b", namespace: "ns", version: 1 })] }
        : { metadata: { continue: "page-2" }, items: [secret({ name: "a", namespace: "ns", version: 1 })] };
    });

    di.override(k8sRequestInjectable, () => k8sRequest);

    expect(await di.inject(requestStoredHelmReleasesInjectable)({ id: "some-cluster" })).toEqual([
      { name: "a", namespace: "ns", version: 1 },
      { name: "b", namespace: "ns", version: 1 },
    ]);
    expect(k8sRequest.mock.calls.map(([, path]) => path).filter((path) => path.includes("/secrets?"))).toEqual([
      `/api/v1/secrets?${new URLSearchParams({ labelSelector: "owner=helm,status!=superseded", limit: "50" })}`,
      `/api/v1/secrets?${new URLSearchParams({ labelSelector: "owner=helm,status!=superseded", limit: "50", continue: "page-2" })}`,
    ]);
  });

  it("skips a release object that cannot be decoded, with a warning, instead of failing the list", async () => {
    const di = getDiForUnitTesting();
    const warn = vi.spyOn(di.inject(loggerInjectionToken), "warn");

    di.override(k8sRequestInjectable, () => async (_cluster, path) => ({
      items: path.includes("/secrets?")
        ? [
            {
              metadata: { name: "sh.helm.release.v1.broken.v1", namespace: "ns" },
              data: { release: Buffer.from(Buffer.from("not json").toString("base64")).toString("base64") },
            },
            secret({ name: "a", namespace: "ns", version: 1 }),
          ]
        : [],
    }));

    expect(await di.inject(requestStoredHelmReleasesInjectable)({ id: "some-cluster" })).toEqual([
      { name: "a", namespace: "ns", version: 1 },
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("ns/sh.helm.release.v1.broken.v1 that cannot be decoded"),
      expect.objectContaining({ error: expect.any(SyntaxError) }),
    );
  });

  it("sorts the releases by name, then by namespace, as helm ls does", async () => {
    const di = getDiForUnitTesting();

    di.override(k8sRequestInjectable, () => async (_cluster, path) => ({
      items: path.includes("/secrets?")
        ? [
            secret({ name: "web", namespace: "b", version: 1 }),
            secret({ name: "api-2", namespace: "a", version: 1 }),
            secret({ name: "web", namespace: "a", version: 1 }),
          ]
        : [configMap({ name: "api", namespace: "c", version: 1 })],
    }));

    expect(
      (await di.inject(requestStoredHelmReleasesInjectable)({ id: "some-cluster" })).map(
        ({ name, namespace }) => `${namespace}/${name}`,
      ),
    ).toEqual(["c/api", "a/api-2", "a/web", "b/web"]);
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

  it("prints the values as helm get values -o yaml does: sorted keys, no folded lines", async () => {
    const di = getDiForUnitTesting();
    const long = "a value long enough to be folded".repeat(4);

    di.override(requestStoredHelmReleasesInjectable, () => async () => [
      {
        name: "a",
        namespace: "ns",
        version: 1,
        info: {} as never,
        manifest: "",
        config: { zeta: 1, alpha: { beta: long, aleph: true } },
        chart: { metadata: { name: "c", version: "1.0.0" }, values: {} },
      },
    ]);

    const values = await di.inject(getClusterHelmReleaseValuesInjectable)({ id: "some-cluster" } as never, {
      name: "a",
      namespace: "ns",
    });

    expect(values).toBe(`alpha:\n  aleph: true\n  beta: ${long}\nzeta: 1\n`);
  });

  it("returns the details of one release with its row of the list, reading only that release", async () => {
    const di = getDiForUnitTesting();
    const stored = {
      name: "a",
      namespace: "ns",
      version: 2,
      info: { status: "deployed", last_deployed: "2026-11-18T07:00:00Z" },
      manifest: "",
      chart: { metadata: { name: "c", version: "1.0.0", appVersion: "2.0" } },
    };
    const k8sRequest = vi.fn(async (_cluster: unknown, path: string) => ({
      items: path.includes("/secrets?") ? [secret(stored)] : [],
    }));

    di.override(k8sRequestInjectable, () => k8sRequest);
    di.unoverride(getHelmReleaseInjectable);
    di.permitSideEffects(getHelmReleaseInjectable);

    const result = await di.inject(getHelmReleaseInjectable)({
      cluster: { id: "some-cluster" } as never,
      namespace: "ns",
      releaseName: "a",
    });

    expect(
      k8sRequest.mock.calls.map(([, path]) => new URLSearchParams(path.split("?")[1]).get("labelSelector")),
    ).toEqual(["owner=helm,status!=superseded,name=a", "owner=helm,status!=superseded,name=a"]);

    const list = await di.inject(listClusterHelmReleasesInjectable)({ id: "some-cluster" } as never, "ns");
    const row = {
      name: "a",
      namespace: "ns",
      revision: "2",
      updated: "2026-11-18T07:00:00Z",
      status: "deployed",
      chart: "c-1.0.0",
      app_version: "2.0",
    };

    expect(result).toMatchObject({ callWasSuccessful: true, response: { listed: row } });
    expect(list).toEqual({ callWasSuccessful: true, response: [row] });
  });
});
