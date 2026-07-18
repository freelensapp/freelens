/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { discoverFor } from "@freelensapp/react-testing-library-discovery";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import currentPathInjectable from "../../renderer/routes/current-path.injectable";

import type { Discover } from "@freelensapp/react-testing-library-discovery";

import type { RenderResult } from "@testing-library/react";
import type { IComputedValue } from "mobx";

import type { LensRendererExtension } from "../../extensions/lens-renderer-extension";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";

describe("preferences - navigation to extension preferences using extension api", () => {
  let rendered: RenderResult;
  let discover: Discover;
  let currentPath: IComputedValue<string>;
  let testExtension: LensRendererExtension;

  beforeEach(async () => {
    const builder = getApplicationBuilder();

    builder.extensions.enable(extensionWithPreferences, someOtherExtensionWithPreferences);

    rendered = await builder.render();

    discover = discoverFor(() => rendered);

    const windowDi = builder.applicationWindow.only.di;

    currentPath = windowDi.inject(currentPathInjectable);

    testExtension = builder.extensions.get("some-test-extension-id").applicationWindows.only;
  });

  describe("when extension navigates to its own preferences", () => {
    beforeEach(() => {
      testExtension.navigateToPreferences();
    });

    it("URL points to the extension's own preferences tab", () => {
      expect(currentPath.get()).toBe("/preferences/some-test-extension-id");
    });

    it("shows the page title for this extension", () => {
      const { discovered } = discover.getSingleElement("preference-page-title");

      expect(discovered).toHaveTextContent("some-test-extension-id preferences");
    });

    it("shows only this extension's preference items", () => {
      const { attributeValues } = discover.queryAllElements("preference-item");

      expect(attributeValues).toEqual([
        "preference-item-for-extension-some-test-extension-id-item-some-preference-item-id",
      ]);
    });

    it("does not show another extension's preferences", () => {
      const { discovered } = discover.querySingleElement(
        "preference-page",
        "preference-item-for-extension-some-other-test-extension-id-page",
      );

      expect(discovered).toBeNull();
    });
  });
});

const extensionWithPreferences: FakeExtensionOptions = {
  id: "some-test-extension-id",
  name: "some-test-extension-id",

  rendererOptions: {
    appPreferences: [
      {
        title: "Some preference item",
        id: "some-preference-item-id",

        components: {
          Hint: () => <div data-testid="some-preference-item-hint" />,
          Input: () => <div data-testid="some-preference-item-input" />,
        },
      },
    ],
  },
};

const someOtherExtensionWithPreferences: FakeExtensionOptions = {
  id: "some-other-test-extension-id",
  name: "some-other-test-extension-id",

  rendererOptions: {
    appPreferences: [
      {
        title: "Some other preference item",
        id: "some-other-preference-item-id",

        components: {
          Hint: () => <div data-testid="some-other-preference-item-hint" />,
          Input: () => <div data-testid="some-other-preference-item-input" />,
        },
      },
    ],
  },
};
