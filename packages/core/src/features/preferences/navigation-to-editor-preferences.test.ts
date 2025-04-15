/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Discover } from "@freelensapp/react-testing-library-discovery";
import { discoverFor } from "@freelensapp/react-testing-library-discovery";
import type { RenderResult } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("preferences - navigation to editor preferences", () => {
  let applicationBuilder: ApplicationBuilder;
  let discover: Discover;

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder();
  });

  describe("given in preferences, when rendered", () => {
    let rendered: RenderResult;

    beforeEach(async () => {
      applicationBuilder.beforeWindowStart(() => {
        applicationBuilder.preferences.navigate();
      });

      rendered = await applicationBuilder.render();

      discover = discoverFor(() => rendered);
    });

    it("renders", () => {
      expect(rendered.container).toMatchSnapshot();
    });
    it("does not show editor preferences yet", () => {
      const { discovered } = discover.querySingleElement("preference-page", "editor-page");

      expect(discovered).toBeNull();
    });

    describe("when navigating to editor preferences using navigation", () => {
      beforeEach(() => {
        applicationBuilder.preferences.navigation.click("editor");
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("shows editor preferences", () => {
        const page = discover.getSingleElement("preference-page", "editor-page");

        expect(page).not.toBeNull();
      });
    });
  });
});
