/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import asyncFn, { type AsyncFnMock } from "@async-fn/vitest";
import { flushPromises } from "@freelensapp/test-utils";
import { act, fireEvent } from "@testing-library/react";
import appEventBusInjectable from "../../common/app-event-bus/app-event-bus.injectable";
import { CatalogCategory, CatalogEntity, categoryVersion } from "../../common/catalog";
import catalogCategoryRegistryInjectable from "../../common/catalog/category-registry.injectable";
import navigateToCatalogInjectable from "../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import catalogEntityRegistryInjectable from "../../renderer/api/catalog/entity/registry.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { advanceFakeTime, testUsingFakeTime } from "../../test-utils/use-fake-time";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";
import type { MockedFunction } from "vitest";

import type { AppEvent } from "../../common/app-event-bus/event-bus";
import type { CatalogEntityActionContext } from "../../common/catalog";
import type { CatalogEntityOnBeforeRun, CatalogEntityRegistry } from "../../renderer/api/catalog/entity/registry";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

class MockCatalogCategory extends CatalogCategory {
  apiVersion = "catalog.k8slens.dev/v1alpha1";
  kind = "CatalogCategory";
  metadata = {
    name: "mock",
    icon: "gear",
  };
  spec = {
    group: "entity.k8slens.dev",
    versions: [
      categoryVersion(
        "v1alpha1",
        (() => {
          const self = this;

          return function (data: any) {
            const entity = new MockCatalogEntity(data);

            entity.onRun = self.onRun;

            return entity;
          } as any;
        })(),
      ),
    ],
    names: {
      kind: "Mock",
    },
  };

  constructor(private onRun: (context: CatalogEntityActionContext) => void | Promise<void>) {
    super();
  }
}

class MockCatalogEntity extends CatalogEntity {
  public apiVersion = "entity.k8slens.dev/v1alpha1";
  public kind = "Mock";
}

function createMockCatalogEntity() {
  return new MockCatalogEntity({
    metadata: {
      uid: "a_catalogEntity_uid",
      name: "a catalog entity",
      labels: {
        test: "label",
      },
    },
    status: {
      phase: "",
    },
    spec: {},
  });
}

describe("entity running technical tests", () => {
  let builder: ApplicationBuilder;
  let windowDi: DiContainer;
  let rendered: RenderResult;
  let appEventListener: MockedFunction<(event: AppEvent) => void>;
  let onRun: MockedFunction<(context: CatalogEntityActionContext) => void | Promise<void>>;
  let catalogEntityRegistry: CatalogEntityRegistry;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    builder.afterWindowStart(({ windowDi }) => {
      onRun = vi.fn();

      const catalogCategoryRegistery = windowDi.inject(catalogCategoryRegistryInjectable);

      catalogCategoryRegistery.add(new MockCatalogCategory(onRun));

      catalogEntityRegistry = windowDi.inject(catalogEntityRegistryInjectable);

      const catalogEntityItem = createMockCatalogEntity();

      catalogEntityRegistry.updateItems([catalogEntityItem]);

      appEventListener = vi.fn();
      windowDi.inject(appEventBusInjectable).addListener(appEventListener);
    });

    testUsingFakeTime();
    rendered = await builder.render();
    windowDi = builder.applicationWindow.only.di;
  });

  describe("when navigated to catalog", () => {
    beforeEach(() => {
      const navigateToCatalog = windowDi.inject(navigateToCatalogInjectable);

      act(() => {
        navigateToCatalog();
      });
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    describe("when details panel is opened", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("icon-for-menu-actions-for-catalog-for-a_catalogEntity_uid"));
        advanceFakeTime(500);
        fireEvent.click(rendered.getByTestId("open-details-menu-item-for-a_catalogEntity_uid"));
        advanceFakeTime(500);
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      describe("can use catalogEntityRegistry.addOnBeforeRun to add hooks for catalog entities", () => {
        let onBeforeRunMock: AsyncFnMock<CatalogEntityOnBeforeRun>;

        beforeEach(() => {
          onBeforeRunMock = asyncFn();
          catalogEntityRegistry.addOnBeforeRun(onBeforeRunMock);
          fireEvent.click(rendered.getByTestId("detail-panel-hot-bar-icon"));
        });

        it("calls on before run event", () => {
          const target = onBeforeRunMock.mock.calls[0][0].target;
          const actual = { id: target.getId(), name: target.getName() };

          expect(actual).toEqual({
            id: "a_catalogEntity_uid",
            name: "a catalog entity",
          });
        });

        it("does not call onRun yet", () => {
          expect(onRun).not.toHaveBeenCalled();
        });

        it("when before run event resolves, calls onRun", async () => {
          await onBeforeRunMock.resolve();

          expect(onRun).toHaveBeenCalled();
        });
      });

      it("onBeforeRun prevents event => onRun wont be triggered", async () => {
        const onBeforeRunMock = vi.fn((event) => event.preventDefault());

        catalogEntityRegistry.addOnBeforeRun(onBeforeRunMock);

        fireEvent.click(rendered.getByTestId("detail-panel-hot-bar-icon"));

        await flushPromises();

        expect(onRun).not.toHaveBeenCalled();
      });

      it("addOnBeforeRun throw an exception => onRun will be triggered", async () => {
        catalogEntityRegistry.addOnBeforeRun(() => {
          throw new Error("some error");
        });

        fireEvent.click(rendered.getByTestId("detail-panel-hot-bar-icon"));

        await flushPromises();

        expect(onRun).toHaveBeenCalled();
      });

      it("addOnRunHook return a promise and does not prevent run event => onRun()", async () => {
        const onRunCalled = new Promise<void>((resolve) => {
          onRun.mockImplementation(() => resolve());
        });

        catalogEntityRegistry.addOnBeforeRun(async () => {});

        fireEvent.click(rendered.getByTestId("detail-panel-hot-bar-icon"));

        await onRunCalled;
      });

      it("addOnRunHook return a promise and prevents event wont be triggered", async () => {
        catalogEntityRegistry.addOnBeforeRun(async (event) => event.preventDefault());

        fireEvent.click(rendered.getByTestId("detail-panel-hot-bar-icon"));

        expect(onRun).not.toHaveBeenCalled();
      });

      it("addOnRunHook return a promise and reject => onRun will be triggered", async () => {
        const onBeforeRunMock = asyncFn();

        catalogEntityRegistry.addOnBeforeRun(onBeforeRunMock);

        fireEvent.click(rendered.getByTestId("detail-panel-hot-bar-icon"));

        await onBeforeRunMock.reject();

        expect(onRun).toHaveBeenCalled();
      });

      it("emits catalog open AppEvent", () => {
        expect(appEventListener).toHaveBeenCalledWith({
          action: "open",
          name: "catalog",
        });
      });

      it("emits catalog change AppEvent when changing the category", () => {
        fireEvent.click(rendered.getByText("Web Links"));

        expect(appEventListener).toHaveBeenCalledWith({
          action: "change-category",
          name: "catalog",
          params: {
            category: "Web Links",
          },
        });
      });
    });
  });
});
