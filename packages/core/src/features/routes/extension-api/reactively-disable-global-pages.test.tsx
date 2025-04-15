/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RenderResult } from "@testing-library/react";
import type { IObservableValue } from "mobx";
import { computed, observable, runInAction } from "mobx";
import React from "react";
import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import type { TestExtensionRenderer } from "../../../renderer/components/test-utils/get-extension-fake";

describe("reactively disable global pages", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let someObservable: IObservableValue<boolean>;
  let rendererTestExtension: TestExtensionRenderer;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    someObservable = observable.box(false);

    const testExtension = {
      id: "test-extension-id",
      name: "test-extension",

      rendererOptions: {
        globalPages: [
          {
            components: {
              Page: () => <div data-testid="some-test-page">Some page</div>,
            },

            enabled: computed(() => someObservable.get()),
          },
        ],
      },
    };

    rendered = await builder.render();

    builder.extensions.enable(testExtension);

    rendererTestExtension = builder.extensions.get("test-extension-id").applicationWindows.only;
  });

  it("when navigating to the page, does not show the page", () => {
    rendererTestExtension.navigate();

    const actual = rendered.queryByTestId("some-test-page");

    expect(actual).not.toBeInTheDocument();
  });

  it("given page becomes enabled, when navigating to the page, shows the page", () => {
    runInAction(() => {
      someObservable.set(true);
    });

    rendererTestExtension.navigate();

    const actual = rendered.queryByTestId("some-test-page");

    expect(actual).toBeInTheDocument();
  });
});
