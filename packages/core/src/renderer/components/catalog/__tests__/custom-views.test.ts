/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DiContextProvider } from "@ogre-tools/injectable-react";
import { render } from "@testing-library/react";
import { computed } from "mobx";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import rendererExtensionsInjectable from "../../../../extensions/renderer-extensions.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import customCategoryViewsInjectable from "../custom-views.injectable";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { DiContainer } from "@ogre-tools/injectable";

import type { CatalogCategory } from "../../../../common/catalog";
import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { CustomCategoryViewComponents, CustomCategoryViewRegistration } from "../custom-views";

describe("Custom Category Views", () => {
  let di: DiContainer;

  // The host wraps every view of an extension in an error boundary, so a view is told apart by what it renders.
  const renderView = ({ View }: CustomCategoryViewComponents) => {
    const { container, unmount } = render(
      React.createElement(
        DiContextProvider,
        { value: di },
        React.createElement(View, { category: {} as CatalogCategory }),
      ),
    );
    const text = container.textContent;

    unmount();

    return text;
  };

  beforeEach(() => {
    try {
      di = getDiForUnitTesting();
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("should order items correctly over all extensions", () => {
    const component1 = (): StrictReactNode => "component1";
    const component2 = (): StrictReactNode => "component2";

    di.override(rendererExtensionsInjectable, () =>
      computed(
        () =>
          [
            {
              customCategoryViews: [
                {
                  components: {
                    View: component1,
                  },
                  group: "foo",
                  kind: "bar",
                  priority: 100,
                } as CustomCategoryViewRegistration,
              ],
            },
            {
              customCategoryViews: [
                {
                  components: {
                    View: component2,
                  },
                  group: "foo",
                  kind: "bar",
                  priority: 95,
                } as CustomCategoryViewRegistration,
              ],
            },
          ] as LensRendererExtension[],
      ),
    );

    const customCategoryViews = di.inject(customCategoryViewsInjectable);
    const { after = [] } = customCategoryViews.get().get("foo")?.get("bar") ?? {};

    expect(after.map(renderView)).toEqual(["component2", "component1"]);
  });

  it("should put put priority < 50 items in before", () => {
    const component1 = (): StrictReactNode => "component1";
    const component2 = (): StrictReactNode => "component2";

    di.override(rendererExtensionsInjectable, () =>
      computed(
        () =>
          [
            {
              customCategoryViews: [
                {
                  components: {
                    View: component1,
                  },
                  group: "foo",
                  kind: "bar",
                  priority: 40,
                } as CustomCategoryViewRegistration,
              ],
            },
            {
              customCategoryViews: [
                {
                  components: {
                    View: component2,
                  },
                  group: "foo",
                  kind: "bar",
                  priority: 95,
                } as CustomCategoryViewRegistration,
              ],
            },
          ] as LensRendererExtension[],
      ),
    );

    const customCategoryViews = di.inject(customCategoryViewsInjectable);
    const { before = [] } = customCategoryViews.get().get("foo")?.get("bar") ?? {};

    expect(before.map(renderView)).toEqual(["component1"]);
  });
});
