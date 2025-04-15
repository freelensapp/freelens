/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import { flushPromises } from "@freelensapp/test-utils";
import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { matches } from "lodash/fp";
import type { IObservableValue } from "mobx";
import { computed, observable, runInAction } from "mobx";
import React from "react";
import directoryForLensLocalStorageInjectable from "../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import { navigateToRouteInjectionToken } from "../../common/front-end-routing/navigate-to-route-injection-token";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import readJsonFileInjectable from "../../common/fs/read-json-file.injectable";
import writeJsonFileInjectable from "../../common/fs/write-json-file.injectable";
import type { ClusterPageMenuRegistration } from "../../extensions/common-api/types";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import routesInjectable from "../../renderer/routes/routes.injectable";
import storageSaveDelayInjectable from "../../renderer/utils/create-storage/storage-save-delay.injectable";
import { advanceFakeTime, testUsingFakeTime } from "../../test-utils/use-fake-time";

describe("cluster - sidebar and tab navigation for extensions", () => {
  let applicationBuilder: ApplicationBuilder;
  let rendered: RenderResult;

  beforeEach(() => {
    testUsingFakeTime("2015-10-21T07:28:00Z");

    applicationBuilder = getApplicationBuilder();

    applicationBuilder.setEnvironmentToClusterFrame();

    applicationBuilder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(storageSaveDelayInjectable, () => 250);

      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");
    });
  });

  describe("given extension with cluster pages and cluster page menus", () => {
    let someObservable: IObservableValue<boolean>;

    beforeEach(() => {
      someObservable = observable.box(false);

      const testExtension = {
        id: "some-extension-id",
        name: "some-extension-name",

        rendererOptions: {
          clusterPages: [
            {
              components: {
                Page: () => {
                  throw new Error("should never come here");
                },
              },
            },
            {
              id: "some-child-page-id",

              components: {
                Page: () => <div data-testid="some-child-page">Some child page</div>,
              },
            },
            {
              id: "some-other-child-page-id",

              components: {
                Page: () => <div data-testid="some-other-child-page">Some other child page</div>,
              },
            },
          ],

          clusterPageMenus: [
            {
              id: "some-parent-id",
              title: "Parent",

              components: {
                Icon: () => <div>Some icon</div>,
              },
            },

            {
              id: "some-child-id",
              target: { pageId: "some-child-page-id" },
              parentId: "some-parent-id",
              title: "Child 1",

              components: {
                Icon: null as never,
              },
            },

            {
              id: "some-other-child-id",
              target: { pageId: "some-other-child-page-id" },
              parentId: "some-parent-id",
              title: "Child 2",

              components: {
                Icon: null as never,
              },
            },

            {
              id: "some-menu-with-controlled-visibility",
              title: "Some menu with controlled visibility",
              visible: computed(() => someObservable.get()),

              components: {
                Icon: () => <div>Some icon</div>,
              },
            },
          ],
        },
      };

      applicationBuilder.extensions.enable(testExtension);
    });

    describe("given no state for expanded sidebar items exists, and navigated to child sidebar item, when rendered", () => {
      beforeEach(async () => {
        rendered = await applicationBuilder.render();

        const windowDi = applicationBuilder.applicationWindow.only.di;

        const navigateToRoute = windowDi.inject(navigateToRouteInjectionToken);

        const route = windowDi
          .inject(routesInjectable)
          .get()
          .find(
            matches({
              path: "/extension/some-extension-name/some-child-page-id",
            }),
          );

        assert(route);
        navigateToRoute(route);
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("parent is highlighted", () => {
        const parent = rendered.getByTestId("sidebar-item-some-extension-name-some-parent-id");

        expect(parent?.dataset.isActiveTest).toBe("true");
      });

      it("parent sidebar item is not expanded", () => {
        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-child-id");

        expect(child).toBeNull();
      });

      it("child page is shown", () => {
        expect(rendered.getByTestId("some-child-page")).not.toBeNull();
      });
    });

    describe("given state for expanded sidebar items already exists, when rendered", () => {
      beforeEach(async () => {
        applicationBuilder.beforeWindowStart(async ({ windowDi }) => {
          const writeJsonFileFake = windowDi.inject(writeJsonFileInjectable);

          await writeJsonFileFake("/some-directory-for-lens-local-storage/some-cluster-id.json", {
            sidebar: {
              expanded: { "sidebar-item-some-extension-name-some-parent-id": true },
              width: 200,
            },
          });
        });

        rendered = await applicationBuilder.render();
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("parent sidebar item is not highlighted", () => {
        const parent = rendered.getByTestId("sidebar-item-some-extension-name-some-parent-id");

        expect(parent?.dataset.isActiveTest).toBe("false");
      });

      it("parent sidebar item is expanded", () => {
        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-child-id");

        expect(child).not.toBeNull();
      });
    });

    describe("given state for expanded unknown sidebar items already exists, when rendered", () => {
      beforeEach(async () => {
        applicationBuilder.beforeWindowStart(async ({ windowDi }) => {
          const writeJsonFileFake = windowDi.inject(writeJsonFileInjectable);

          await writeJsonFileFake("/some-directory-for-lens-local-storage/some-cluster-id.json", {
            sidebar: {
              expanded: { "some-extension-name-some-unknown-parent-id": true },
              width: 200,
            },
          });
        });

        rendered = await applicationBuilder.render();
      });

      it("renders without errors", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("parent sidebar item is not expanded", () => {
        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-child-id");

        expect(child).toBeNull();
      });
    });

    describe("given empty state for expanded sidebar items already exists, when rendered", () => {
      beforeEach(async () => {
        applicationBuilder.beforeWindowStart(async ({ windowDi }) => {
          const writeJsonFileFake = windowDi.inject(writeJsonFileInjectable);

          await writeJsonFileFake("/some-directory-for-lens-local-storage/some-cluster-id.json", {
            someThingButSidebar: {},
          });
        });

        rendered = await applicationBuilder.render();
      });

      it("renders without errors", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("parent sidebar item is not expanded", () => {
        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-child-id");

        expect(child).toBeNull();
      });
    });

    describe("given no initially persisted state for sidebar items, when rendered", () => {
      let windowDi: DiContainer;

      beforeEach(async () => {
        rendered = await applicationBuilder.render();

        windowDi = applicationBuilder.applicationWindow.only.di;
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("parent sidebar item is not highlighted", () => {
        const parent = rendered.getByTestId("sidebar-item-some-extension-name-some-parent-id");

        expect(parent?.dataset.isActiveTest).toBe("false");
      });

      it("parent sidebar item is not expanded", () => {
        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-child-id");

        expect(child).toBeNull();
      });

      it("does not show the sidebar item that should be hidden", () => {
        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-menu-with-controlled-visibility");

        expect(child).not.toBeInTheDocument();
      });

      it("when sidebar item becomes visible, shows the sidebar item", () => {
        runInAction(() => {
          someObservable.set(true);
        });

        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-menu-with-controlled-visibility");

        expect(child).toBeInTheDocument();
      });

      describe("when a parent sidebar item is expanded", () => {
        beforeEach(() => {
          const parentLink = rendered.getByTestId("link-for-sidebar-item-some-extension-name-some-parent-id");

          fireEvent.click(parentLink);
        });

        it("renders", () => {
          expect(rendered.container).toMatchSnapshot();
        });

        it("parent sidebar item is not highlighted", () => {
          const parent = rendered.getByTestId("sidebar-item-some-extension-name-some-parent-id");

          expect(parent?.dataset.isActiveTest).toBe("false");
        });

        it("parent sidebar item is expanded", () => {
          const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-child-id");

          expect(child).not.toBeNull();
        });

        describe("when a child of the parent is selected", () => {
          beforeEach(() => {
            const childLink = rendered.getByTestId("link-for-sidebar-item-some-extension-name-some-child-id");

            fireEvent.click(childLink);
          });

          it("renders", () => {
            expect(rendered.container).toMatchSnapshot();
          });

          it("parent is highlighted", () => {
            const parent = rendered.getByTestId("sidebar-item-some-extension-name-some-parent-id");

            expect(parent?.dataset.isActiveTest).toBe("true");
          });

          it("child is highlighted", () => {
            const child = rendered.getByTestId("sidebar-item-some-extension-name-some-child-id");

            expect(child?.dataset.isActiveTest).toBe("true");
          });

          it("child page is shown", () => {
            expect(rendered.getByTestId("some-child-page")).not.toBeNull();
          });

          it("renders tabs", () => {
            expect(rendered.getByTestId("tab-layout")).not.toBeNull();
          });

          it("tab for child page is active", () => {
            const tabLink = rendered.getByTestId("tab-link-for-sidebar-item-some-extension-name-some-child-id");

            expect(tabLink.dataset.isActiveTest).toBe("true");
          });

          it("tab for sibling page is not active", () => {
            const tabLink = rendered.getByTestId("tab-link-for-sidebar-item-some-extension-name-some-other-child-id");

            expect(tabLink.dataset.isActiveTest).toBe("false");
          });

          it("when not enough time passes, does not store state for expanded sidebar items to file system yet", async () => {
            advanceFakeTime(250 - 1);

            const pathExistsFake = windowDi.inject(pathExistsInjectable);

            const actual = await pathExistsFake("/some-directory-for-lens-local-storage/some-cluster-id.json");

            expect(actual).toBe(false);
          });

          it("when enough time passes, stores state for expanded sidebar items to file system", async () => {
            advanceFakeTime(250);

            const readJsonFileFake = windowDi.inject(readJsonFileInjectable);

            await flushPromises(); // Needed because of several async calls

            const actual = await readJsonFileFake("/some-directory-for-lens-local-storage/some-cluster-id.json");

            expect(actual).toEqual({
              sidebar: {
                expanded: { "sidebar-item-some-extension-name-some-parent-id": true },
                width: 200,
              },
            });
          });

          describe("when selecting sibling tab", () => {
            beforeEach(() => {
              const childTabLink = rendered.getByTestId(
                "tab-link-for-sidebar-item-some-extension-name-some-other-child-id",
              );

              fireEvent.click(childTabLink);
            });

            it("renders", () => {
              expect(rendered.container).toMatchSnapshot();
            });

            it("sibling child page is shown", () => {
              expect(rendered.getByTestId("some-other-child-page")).not.toBeNull();
            });

            it("tab for sibling page is active", () => {
              const tabLink = rendered.getByTestId("tab-link-for-sidebar-item-some-extension-name-some-other-child-id");

              expect(tabLink.dataset.isActiveTest).toBe("true");
            });

            it("tab for previous page is not active", () => {
              const tabLink = rendered.getByTestId("tab-link-for-sidebar-item-some-extension-name-some-child-id");

              expect(tabLink.dataset.isActiveTest).toBe("false");
            });
          });
        });
      });
    });
  });

  describe("given extension with cluster pages and cluster page menus with explicit 'orderNumber'", () => {
    let someObservable: IObservableValue<boolean>;

    beforeEach(() => {
      someObservable = observable.box(false);

      const testExtension = {
        id: "some-extension-id",
        name: "some-extension-name",

        rendererOptions: {
          clusterPages: [
            {
              components: {
                Page: () => {
                  throw new Error("should never come here");
                },
              },
            },
            {
              id: "some-child-page-id",

              components: {
                Page: () => <div data-testid="some-child-page">Some child page</div>,
              },
            },
            {
              id: "some-other-child-page-id",

              components: {
                Page: () => <div data-testid="some-other-child-page">Some other child page</div>,
              },
            },
          ],

          clusterPageMenus: [
            {
              id: "some-parent-id",
              title: "Parent",
              components: {
                Icon: () => <div>Some icon</div>,
              },
              orderNumber: -Infinity,
            },
            {
              id: "some-child-id",
              target: { pageId: "some-child-page-id" },
              parentId: "some-parent-id",
              title: "Child 1",
              components: {
                Icon: null as never,
              },
            },
            {
              id: "some-other-child-id",
              target: { pageId: "some-other-child-page-id" },
              parentId: "some-parent-id",
              title: "Child 2",
              components: {
                Icon: null as never,
              },
            },
            {
              id: "some-menu-with-controlled-visibility",
              title: "Some menu with controlled visibility",
              visible: computed(() => someObservable.get()),
              components: {
                Icon: () => <div>Some icon</div>,
              },
            },
          ] as ClusterPageMenuRegistration[],
        },
      };

      applicationBuilder.extensions.enable(testExtension);
    });

    describe("given no state for expanded sidebar items exists, and navigated to child sidebar item, when rendered", () => {
      beforeEach(async () => {
        rendered = await applicationBuilder.render();

        const windowDi = applicationBuilder.applicationWindow.only.di;

        const navigateToRoute = windowDi.inject(navigateToRouteInjectionToken);

        const route = windowDi
          .inject(routesInjectable)
          .get()
          .find(
            matches({
              path: "/extension/some-extension-name/some-child-page-id",
            }),
          );

        assert(route);
        navigateToRoute(route);
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("renderes parent as first item in sidebar", () => {
        const parent = rendered.getByTestId("sidebar-item-some-extension-name-some-parent-id");

        assert(parent);
        expect(parent.previousSibling).toBeNull();
      });

      it("parent is highlighted", () => {
        const parent = rendered.getByTestId("sidebar-item-some-extension-name-some-parent-id");

        expect(parent?.dataset.isActiveTest).toBe("true");
      });

      it("parent sidebar item is not expanded", () => {
        const child = rendered.queryByTestId("sidebar-item-some-extension-name-some-child-id");

        expect(child).toBeNull();
      });

      it("child page is shown", () => {
        expect(rendered.getByTestId("some-child-page")).not.toBeNull();
      });
    });
  });
});
