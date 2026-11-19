/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { cast } from "../../test-utils/cast";
import createCanIInjectable from "./create-can-i.injectable";
import createRequestNamespaceListPermissionsInjectable from "./create-request-namespace-list-permissions.injectable";

import type { Logger } from "@freelensapp/logger";

import type { AuthorizationV1Api } from "@kubernetes/client-node";
import type { DiContainer } from "@ogre-tools/injectable";

import type { KubeApiResource } from "../../common/rbac";

describe("an access review whose cluster was disconnected while it ran", () => {
  let di: DiContainer;
  let logger: Record<"debug" | "error", ReturnType<typeof vi.fn>>;
  const failure = new Error("fetch failed (The client is destroyed)");
  const api = cast<AuthorizationV1Api>({
    createSelfSubjectAccessReview: () => Promise.reject(failure),
    createSelfSubjectRulesReview: () => Promise.reject(failure),
  });
  const resource = cast<KubeApiResource>({ apiName: "pods", group: "" });

  beforeEach(() => {
    di = getDiForUnitTesting();
    logger = { debug: vi.fn(), error: vi.fn() };
    di.override(loggerInjectionToken, () => ({ ...logger, info: vi.fn(), warn: vi.fn(), silly: vi.fn() }) as Logger);
  });

  describe.each([
    ["canceled", true],
    ["not canceled", false],
  ])("when the review is %s", (_name, canceled) => {
    const isCanceled = () => canceled;

    it("denies the access and logs the failure at the level that fits", async () => {
      const canI = di.inject(createCanIInjectable)(api, { isCanceled });

      expect(await canI({ verb: "watch", resource: "*" })).toBe(false);
      expect(logger.error).toHaveBeenCalledTimes(canceled ? 0 : 1);
      expect(logger.debug).toHaveBeenCalledTimes(canceled ? 1 : 0);
    });

    it("lists the namespace as denied only when canceled, and logs the failure at the level that fits", async () => {
      const requestNamespaceListPermissions = di.inject(createRequestNamespaceListPermissionsInjectable)(api, {
        isCanceled,
      });
      const canList = await requestNamespaceListPermissions("some-namespace");

      // A failed review otherwise allows everything, so that a cluster without
      // the API still lists its resources.
      expect(canList(resource)).toBe(!canceled);
      expect(logger.error).toHaveBeenCalledTimes(canceled ? 0 : 1);
      expect(logger.debug).toHaveBeenCalledTimes(canceled ? 1 : 0);
    });
  });
});
