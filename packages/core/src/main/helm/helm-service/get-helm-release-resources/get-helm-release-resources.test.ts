/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import asyncFn from "@async-fn/vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import execHelmInjectable from "../../exec-helm/exec-helm.injectable";
import getHelmReleaseResourcesInjectable from "./get-helm-release-resources.injectable";

import type { KubeJsonApiData } from "@freelensapp/kube-object";
import type { AsyncResult } from "@freelensapp/utilities";

import type { AsyncFnMock } from "@async-fn/vitest";

import type { ExecHelm } from "../../exec-helm/exec-helm.injectable";
import type { GetHelmReleaseResources } from "./get-helm-release-resources.injectable";

describe("get helm release resources", () => {
  let getHelmReleaseResources: GetHelmReleaseResources;
  let execHelmMock: AsyncFnMock<ExecHelm>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    execHelmMock = asyncFn();

    di.override(execHelmInjectable, () => execHelmMock);

    getHelmReleaseResources = di.inject(getHelmReleaseResourcesInjectable);
  });

  describe("when called", () => {
    let actualPromise: AsyncResult<KubeJsonApiData[], string>;

    beforeEach(() => {
      actualPromise = getHelmReleaseResources("some-release", "some-namespace", {
        kubeconfigPath: "/some-kubeconfig-path",
        cacheDirectoryPath: "/some-cache-directory-path",
      });
    });

    it("calls for release manifest with the cache directory of the kubeconfig", () => {
      expect(execHelmMock).toHaveBeenCalledWith(
        ["get", "manifest", "some-release", "--namespace", "some-namespace", "--kubeconfig", "/some-kubeconfig-path"],
        { env: { KUBECACHEDIR: "/some-cache-directory-path" } },
      );
    });

    it("when call for manifest resolves without resources, resolves without resources", async () => {
      await execHelmMock.resolve({
        callWasSuccessful: true,
        response: "",
      });

      const actual = await actualPromise;

      expect(actual).toEqual({
        callWasSuccessful: true,
        response: [],
      });
    });

    it("when call to manifest resolves with resources, resolves with resources", async () => {
      await execHelmMock.resolve({
        callWasSuccessful: true,
        response: `---
apiVersion: v1
kind: SomeKind
metadata:
  name: some-resource-with-same-namespace
  namespace: some-namespace
---
apiVersion: v1
kind: SomeOtherKind
metadata:
  name: some-resource-without-namespace
---
apiVersion: v1
kind: List
items:
  - apiVersion: monitoring.coreos.com/v1
    kind: ServiceMonitor
    metadata:
      name: collection-sumologic-fluentd-logs
      namespace: some-namespace
---
apiVersion: v1
kind: SomeKind
metadata:
  name: some-resource-with-different-namespace
  namespace: some-other-namespace
---
`,
      });

      expect(await actualPromise).toEqual({
        callWasSuccessful: true,
        response: [
          {
            apiVersion: "v1",
            kind: "SomeKind",
            metadata: {
              name: "some-resource-with-same-namespace",
              namespace: "some-namespace",
            },
          },
          {
            apiVersion: "v1",
            kind: "SomeOtherKind",
            metadata: {
              name: "some-resource-without-namespace",
            },
          },
          {
            apiVersion: "monitoring.coreos.com/v1",
            kind: "ServiceMonitor",
            metadata: {
              name: "collection-sumologic-fluentd-logs",
              namespace: "some-namespace",
            },
          },
          {
            apiVersion: "v1",
            kind: "SomeKind",
            metadata: {
              name: "some-resource-with-different-namespace",
              namespace: "some-other-namespace",
            },
          },
        ],
      });
    });
  });
});
