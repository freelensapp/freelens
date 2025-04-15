/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import type { RenderResult } from "@testing-library/react";
import { computed } from "mobx";
import React from "react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";

describe("status-bar-items-originating-from-extensions", () => {
  let applicationBuilder: ApplicationBuilder;

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder();

    applicationBuilder.beforeWindowStart(({ windowDi }) => {
      windowDi.unoverride(getRandomIdInjectionToken);
      windowDi.permitSideEffects(getRandomIdInjectionToken);
    });
  });

  describe("when application starts", () => {
    let rendered: RenderResult;

    beforeEach(async () => {
      rendered = await applicationBuilder.render();
    });

    it("when multiple extensions with status bar items are loaded, shows items in correct order", () => {
      const testExtension1 = {
        id: "some-id",
        name: "some-name",

        rendererOptions: {
          statusBarItems: [
            {
              components: {
                Item: () => <div data-testid="some-testId">extension1</div>,
                position: "right" as const,
              },
            },
          ],
        },
      };

      const testExtension2 = {
        id: "some-other-id",
        name: "some-other-name",

        rendererOptions: {
          statusBarItems: [
            {
              components: {
                Item: () => <div data-testid="some-testId">extension2</div>,
                position: "right" as const,
              },
            },
          ],
        },
      };

      applicationBuilder.extensions.enable(testExtension1, testExtension2);

      const rightSide = rendered.getByTestId("status-bar-right");

      const actual = getExpectedTestStatusBarTexts(rightSide, ["extension1", "extension2"]);

      expect(actual).toEqual(["extension2", "extension1"]);
    });

    describe("when extension with status bar items is loaded", () => {
      let testExtensionOptions: FakeExtensionOptions;

      beforeEach(() => {
        testExtensionOptions = {
          id: "some-id",
          name: "some-name",

          rendererOptions: {
            statusBarItems: [
              {
                item: () => <span data-testid="some-testId">right1</span>,
              },
              {
                item: () => <span data-testid="some-testId">right2</span>,
              },
              {
                components: {
                  Item: () => <div data-testid="some-testId">right3</div>,
                  position: "right" as const,
                },
              },
              {
                components: {
                  Item: () => <div data-testid="some-testId">right4</div>,
                  position: "right" as const,
                },
                visible: computed(() => false),
              },
              {
                components: {
                  Item: () => <div data-testid="some-testId">left1</div>,
                  position: "left" as const,
                },
              },
              {
                components: {
                  Item: () => <div data-testid="some-testId">left2</div>,
                  position: "left" as const,
                },
              },
            ],
          },
        };

        applicationBuilder.extensions.enable(testExtensionOptions);
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("shows right side status bar items in the correct order", () => {
        const rightSide = rendered.getByTestId("status-bar-right");

        const actual = getExpectedTestStatusBarTexts(rightSide, ["right1", "right2", "right3"]);

        expect(actual).toEqual(["right3", "right2", "right1"]);
      });

      it("doesn't show invisible status bar item", () => {
        const rightSide = rendered.getByTestId("status-bar-right");

        expect(getTestStatusBarTexts(rightSide)).not.toContain("right4");
      });

      it("shows left side status bar items in the correct order", () => {
        const leftSide = rendered.getByTestId("status-bar-left");

        const actual = getExpectedTestStatusBarTexts(leftSide, ["left2", "left1"]);

        expect(actual).toEqual(["left1", "left2"]);
      });

      it("when the extension is removed, shows there are no extension status bar items", () => {
        applicationBuilder.extensions.disable(testExtensionOptions);

        const actual = rendered.queryAllByTestId("some-testId");

        expect(actual).toHaveLength(0);
      });
    });
  });
});

const getTestStatusBarTexts = (actual: HTMLElement) =>
  Array.from(actual.children).map((elem) => String(elem.textContent));

const getExpectedTestStatusBarTexts = (actual: HTMLElement, expectedTexts: string[]) =>
  getTestStatusBarTexts(actual).filter((textContent) => textContent && expectedTexts.includes(textContent));
