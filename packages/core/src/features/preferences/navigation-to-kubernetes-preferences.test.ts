/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { discoverFor } from "@freelensapp/react-testing-library-discovery";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import getActiveHelmRepositoriesInjectable from "../../main/helm/repositories/get-active-helm-repositories/get-active-helm-repositories.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import requestPublicHelmRepositoriesInjectable from "../helm-charts/child-features/preferences/renderer/adding-of-public-helm-repository/public-helm-repositories/request-public-helm-repositories.injectable";
import userPreferencesStateInjectable from "../user-preferences/common/state.injectable";

import type { Discover } from "@freelensapp/react-testing-library-discovery";

import type { RenderResult } from "@testing-library/react";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("preferences - navigation to kubernetes preferences", () => {
  let builder: ApplicationBuilder;

  beforeEach(() => {
    builder = getApplicationBuilder();
  });

  describe("given in preferences, when rendered", () => {
    let rendered: RenderResult;
    let discover: Discover;

    beforeEach(async () => {
      builder.beforeApplicationStart(({ mainDi }) => {
        mainDi.override(getActiveHelmRepositoriesInjectable, () => async () => ({
          callWasSuccessful: true,
          response: [],
        }));
      });

      builder.beforeWindowStart(({ windowDi }) => {
        windowDi.override(requestPublicHelmRepositoriesInjectable, () => async () => []);
      });

      builder.beforeWindowStart(() => {
        builder.preferences.navigate();
      });

      rendered = await builder.render();

      discover = discoverFor(() => rendered);
    });

    it("renders", () => {
      expect(rendered.container).toMatchSnapshot();
    });

    it("does not show kubernetes preferences yet", () => {
      const { discovered } = discover.querySingleElement("preference-page", "kubernetes-page");

      expect(discovered).toBeNull();
    });

    describe("when navigating to kubernetes preferences using navigation", () => {
      beforeEach(() => {
        builder.preferences.navigation.click("kubernetes");
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("shows kubernetes preferences", () => {
        const { discovered } = discover.getSingleElement("preference-page", "kubernetes-page");

        expect(discovered).not.toBeNull();
      });

      describe("the pods of a combined logs tab", () => {
        const getInput = () => rendered.getByTestId("max-combined-logs-pods-input") as HTMLInputElement;
        const getStoredValue = () =>
          builder.applicationWindow.only.di.inject(userPreferencesStateInjectable).logViewerPreferences
            .maxCombinedLogsPods;

        it("shows the default", () => {
          expect(getInput().value).toBe("20");
        });

        it("stores a number typed in", () => {
          fireEvent.change(getInput(), { target: { value: "45" } });

          expect(getStoredValue()).toBe(45);
        });

        it("stores a number outside the range clamped, and shows it when the field is left", () => {
          fireEvent.change(getInput(), { target: { value: "500" } });

          expect(getStoredValue()).toBe(100);

          fireEvent.blur(getInput());

          expect(getInput().value).toBe("100");
        });

        it("keeps the stored value while the field is cleared", () => {
          fireEvent.change(getInput(), { target: { value: "45" } });
          fireEvent.change(getInput(), { target: { value: "" } });

          expect(getStoredValue()).toBe(45);
        });
      });
    });
  });
});
