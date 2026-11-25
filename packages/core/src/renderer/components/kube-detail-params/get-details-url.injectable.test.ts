/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import getDetailsUrlInjectable from "./get-details-url.injectable";

import type { ObservableHistory } from "@freelensapp/routing";

import type { GetDetailsUrl } from "./get-details-url.injectable";

const selfLink = "/api/v1/namespaces/default/pods/some-pod";

describe("getDetailsUrl", () => {
  let getDetailsUrl: GetDetailsUrl;
  let observableHistory: ObservableHistory<unknown>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    getDetailsUrl = di.inject(getDetailsUrlInjectable);
    observableHistory = di.inject(observableHistoryInjectionToken);
  });

  describe("given nothing is selected", () => {
    beforeEach(() => {
      observableHistory.push("/events");
    });

    it("sets no kube-selected", () => {
      const params = new URLSearchParams(getDetailsUrl(selfLink));

      expect(params.get("kube-details")).toBe(selfLink);
      expect(params.has("kube-selected")).toBe(false);
    });

    it("sets no kube-selected without merging the globals", () => {
      const params = new URLSearchParams(getDetailsUrl(selfLink, false, false));

      expect(params.has("kube-selected")).toBe(false);
    });
  });

  describe("given an object is selected", () => {
    const selected = "/api/v1/namespaces/default/pods/selected-pod";

    beforeEach(() => {
      observableHistory.push(`/events?${new URLSearchParams({ "kube-selected": selected })}`);
    });

    it("keeps kube-selected", () => {
      const params = new URLSearchParams(getDetailsUrl(selfLink));

      expect(params.get("kube-details")).toBe(selfLink);
      expect(params.get("kube-selected")).toBe(selected);
    });

    it("drops kube-selected when resetSelected is set", () => {
      const params = new URLSearchParams(getDetailsUrl(selfLink, true));

      expect(params.has("kube-selected")).toBe(false);
    });
  });

  describe("given details are shown and nothing is selected", () => {
    const shown = "/api/v1/namespaces/default/pods/shown-pod";

    beforeEach(() => {
      observableHistory.push(`/events?${new URLSearchParams({ "kube-details": shown })}`);
    });

    it("selects the object whose details are shown", () => {
      const params = new URLSearchParams(getDetailsUrl(selfLink));

      expect(params.get("kube-details")).toBe(selfLink);
      expect(params.get("kube-selected")).toBe(shown);
    });
  });
});
