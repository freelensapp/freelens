/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { act, waitFor } from "@testing-library/react";
import { noop } from "es-toolkit";
import { autorun } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import navigateToCustomResourcesInjectable from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import { LensExtensionKubeObject } from "../../extensions/common-api/k8s-api";
import { columnsFor } from "../../extensions/renderer-api/kube-object-registrations";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import customResourceColumnsOfExtensionsInjectable from "../../renderer/components/custom-resources/custom-resource-columns-of-extensions.injectable";
import kubeDetailsUrlParamInjectable from "../../renderer/components/kube-detail-params/kube-details-url.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { Logger } from "@freelensapp/logger";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";

import type { CustomResourceColumnProps } from "../../renderer/components/custom-resources/custom-resource-columns-registration";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";

const group = "fluxcd.controlplane.io";

class FluxInstance extends LensExtensionKubeObject {
  static readonly kind = "FluxInstance";
  static readonly namespaced = true;
  static readonly crd = { apiVersions: [`${group}/v1`], plural: "fluxinstances", singular: "fluxinstance" };
}

const fluxInstanceDefinition = new CustomResourceDefinition({
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: {
    name: `fluxinstances.${group}`,
    selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/fluxinstances.${group}`,
    uid: "fluxinstances-crd-uid",
    resourceVersion: "1",
  },
  spec: {
    group,
    scope: "Namespaced",
    names: { kind: "FluxInstance", plural: "fluxinstances", singular: "fluxinstance" },
    versions: [
      {
        name: "v1",
        served: true,
        storage: true,
        additionalPrinterColumns: [
          { name: "Ready", jsonPath: '.status.conditions[?(@.type=="Ready")].status', type: "string" },
          { name: "Status", jsonPath: '.status.conditions[?(@.type=="Ready")].message', type: "string" },
          { name: "Revision", jsonPath: ".status.lastAppliedRevision", type: "string" },
        ],
      },
    ],
  },
});

const someFluxInstance = new KubeObject({
  apiVersion: `${group}/v1`,
  kind: "FluxInstance",
  metadata: {
    name: "flux",
    namespace: "flux-system",
    selfLink: `/apis/${group}/v1/namespaces/flux-system/fluxinstances/flux`,
    uid: "flux-uid",
    resourceVersion: "1",
  },
  status: {
    conditions: [{ type: "Ready", status: "True", message: "Reconciliation finished" }],
    lastAppliedRevision: "v2.4.0@sha256:0123456789abcdef",
  },
} as never);

const otherFluxInstance = new KubeObject({
  apiVersion: `${group}/v1`,
  kind: "FluxInstance",
  metadata: {
    name: "another-flux",
    namespace: "flux-system",
    selfLink: `/apis/${group}/v1/namespaces/flux-system/fluxinstances/another-flux`,
    uid: "another-flux-uid",
    resourceVersion: "1",
  },
  status: {
    conditions: [{ type: "Ready", status: "False", message: "Reconciliation failed" }],
    lastAppliedRevision: "v2.3.0@sha256:0123456789abcdef",
  },
} as never);

const ReadyBadge = ({ value }: CustomResourceColumnProps<FluxInstance>) => (
  <span data-testid="ready-badge">{`ready: ${String(value)}`}</span>
);
const OtherReadyBadge = ({ value }: CustomResourceColumnProps<FluxInstance>) => (
  <span data-testid="other-ready-badge">{`other: ${String(value)}`}</span>
);

const fluxExtension: FakeExtensionOptions = {
  id: "flux-extension-id",
  name: "flux-extension",
  rendererOptions: {
    customResourceColumns: [
      columnsFor(FluxInstance, {
        columns: { Ready: { Render: ReadyBadge }, Status: { hidden: true } },
      }),
    ],
  },
};

describe("printer columns of custom resources registered by extensions", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let windowDi: DiContainer;
  let loggerStub: Logger;

  let stopObserving: () => void;

  const getColumns = (kind: string, apiVersion: string) =>
    windowDi.inject(customResourceColumnsOfExtensionsInjectable)(kind, apiVersion);

  // Whether an extension is enabled for the cluster resolves asynchronously,
  // and only while something observes it, as the details and the list do.
  const enableExtension = async (...extensions: FakeExtensionOptions[]) => {
    await act(async () => {
      builder.extensions.enable(...extensions);
    });
    await waitFor(() => expect(getColumns("FluxInstance", `${group}/v1`).size).toBeGreaterThan(0), {
      timeout: 300,
    });
  };

  beforeEach(async () => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    loggerStub = {
      error: vi.fn(),
      warn: vi.fn(),
      debug: noop,
      info: noop,
      silly: noop,
    };

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(loggerInjectionToken, () => loggerStub);
    });

    builder.afterWindowStart(({ windowDi }) => {
      windowDi.inject(customResourceDefinitionStoreInjectable).items.replace([fluxInstanceDefinition]);
    });

    result = await builder.render();
    windowDi = builder.applicationWindow.only.di;

    builder.allowKubeResource({ group: "apiextensions.k8s.io", apiName: "customresourcedefinitions" });
    builder.allowKubeResource({ group, apiName: "fluxinstances" });
    builder.namespaces.add("flux-system");
    builder.namespaces.select("flux-system");

    stopObserving = autorun(() => getColumns("FluxInstance", `${group}/v1`));
  });

  afterEach(() => {
    stopObserving();
  });

  it("has no columns before an extension registers them", () => {
    expect(getColumns("FluxInstance", `${group}/v1`).size).toBe(0);
  });

  describe("given an enabled extension registers columns of a kind", () => {
    beforeEach(async () => {
      await enableExtension(fluxExtension);
    });

    it("applies them to the kind and the versions it lists", () => {
      const columns = getColumns("FluxInstance", `${group}/v1`);

      expect([...columns.keys()]).toEqual(["Ready", "Status"]);
      expect(columns.get("Ready")).toEqual({ extensionName: "flux-extension", column: { Render: ReadyBadge } });
      expect(columns.get("Status")).toEqual({ extensionName: "flux-extension", column: { hidden: true } });
    });

    it("does not apply them to another version of the kind", () => {
      expect(getColumns("FluxInstance", `${group}/v1beta1`).size).toBe(0);
    });

    it("does not apply them to another kind of the version", () => {
      expect(getColumns("ResourceSet", `${group}/v1`).size).toBe(0);
    });

    describe("when an object of the kind is opened in the details", () => {
      // The printer columns by name, without the conditions drawer that follows them.
      const getColumnValues = () =>
        Object.fromEntries(
          Array.from(
            result.container.querySelectorAll(".CustomResourceDetails > .DrawerItem:not(.conditions)"),
            (item) => [item.querySelector(".name")?.textContent, item.querySelector(".value")?.textContent],
          ),
        );

      beforeEach(async () => {
        windowDi
          .inject(apiManagerInjectable)
          .getStore(fluxInstanceDefinition.getResourceApiBase())
          ?.items.replace([someFluxInstance]);

        act(() => windowDi.inject(kubeDetailsUrlParamInjectable).set(someFluxInstance.selfLink));

        await waitFor(
          () => expect(result.container.querySelector(".CustomResourceDetails.FluxInstance")).toBeInTheDocument(),
          { timeout: 300 },
        );
      });

      it("renders the registered column with the extension's component and leaves out the hidden one", () => {
        expect(getColumnValues()).toEqual({
          Ready: "ready: True",
          Revision: "v2.4.0@sha256:0123456789abcdef",
        });
      });

      it("shows the columns as before once the extension is disabled", async () => {
        await act(async () => {
          builder.extensions.disable(fluxExtension);
        });

        await waitFor(
          () =>
            expect(getColumnValues()).toEqual({
              Ready: "True",
              Status: "Reconciliation finished",
              Revision: "v2.4.0@sha256:0123456789abcdef",
            }),
          { timeout: 300 },
        );
      });
    });

    describe("when the list of the kind is opened", () => {
      const getHeaderTitles = () =>
        Array.from(result.container.querySelectorAll(".CustomResources .TableHead .TableCell"), (cell) =>
          cell.textContent?.replace("arrow_drop_down", "").trim(),
        ).filter(Boolean);
      const getRowNames = () =>
        Array.from(result.container.querySelectorAll(".CustomResources .TableRow"), (row) =>
          row.textContent?.includes("another-flux") ? "another-flux" : "flux",
        );

      beforeEach(async () => {
        windowDi
          .inject(apiManagerInjectable)
          .getStore(fluxInstanceDefinition.getResourceApiBase())
          ?.items.replace([someFluxInstance, otherFluxInstance]);

        act(() => windowDi.inject(navigateToCustomResourcesInjectable)({ group, name: "fluxinstances" }));

        await waitFor(() => expect(getRowNames()).toHaveLength(2), { timeout: 300 });
      });

      it("leaves the hidden column out of the header", () => {
        expect(getHeaderTitles()).toEqual(["Name", "Namespace", "Ready", "Revision", "Age", "more_vert"]);
        expect(result.queryByTestId("custom-resource-column-title-status")).not.toBeInTheDocument();
      });

      it("leaves the hidden column out of the columns the user can toggle", async () => {
        act(() =>
          (result.container.querySelector("#menu-actions-for-item-object-list-content") as HTMLElement).click(),
        );

        await waitFor(
          () =>
            expect(
              Array.from(document.querySelectorAll(".ItemListLayoutVisibilityMenu .Checkbox"), (checkbox) =>
                checkbox.textContent?.trim(),
              ),
            ).toEqual(["Name", "Namespace", "Ready", "Revision", "Age"]),
          { timeout: 300 },
        );
      });

      it("leaves the hidden column out of the cells", () => {
        expect(result.queryByTestId("custom-resource-column-cell-status-for-flux-system/flux")).not.toBeInTheDocument();
        expect(result.container.querySelector(".CustomResources")).not.toHaveTextContent("Reconciliation finished");
      });

      it("renders the cells of the registered column with the extension's component", () => {
        expect(result.getByTestId("custom-resource-column-cell-ready-for-flux-system/flux")).toHaveTextContent(
          "ready: True",
        );
        expect(result.getByTestId("custom-resource-column-cell-ready-for-flux-system/another-flux")).toHaveTextContent(
          "ready: False",
        );
      });

      it("shows the cells of a column the registration does not name as before", () => {
        expect(result.getByTestId("custom-resource-column-cell-revision-for-flux-system/flux")).toHaveTextContent(
          "v2.4.0@sha256:0123456789abcdef",
        );
      });

      it("sorts the registered column by its raw value", async () => {
        act(() => result.getByTestId("custom-resource-column-title-ready").click());

        await waitFor(() => expect(getRowNames()).toEqual(["another-flux", "flux"]), { timeout: 300 });

        act(() => result.getByTestId("custom-resource-column-title-ready").click());

        await waitFor(() => expect(getRowNames()).toEqual(["flux", "another-flux"]), { timeout: 300 });
      });
    });

    it("drops them when the extension is disabled", async () => {
      await act(async () => {
        builder.extensions.disable(fluxExtension);
      });

      expect(getColumns("FluxInstance", `${group}/v1`).size).toBe(0);
    });
  });

  describe("given an enabled extension renders a column of the list with a component that throws", () => {
    const Throwing = () => {
      throw new Error("some error");
    };

    beforeEach(async () => {
      vi.spyOn(console, "error").mockImplementation(noop);

      await enableExtension({
        id: "throwing-extension-id",
        name: "throwing-extension",
        rendererOptions: {
          customResourceColumns: [columnsFor(FluxInstance, { columns: { Ready: { Render: Throwing } } })],
        },
      });

      windowDi
        .inject(apiManagerInjectable)
        .getStore(fluxInstanceDefinition.getResourceApiBase())
        ?.items.replace([someFluxInstance]);

      act(() => windowDi.inject(navigateToCustomResourcesInjectable)({ group, name: "fluxinstances" }));

      await waitFor(
        () => expect(result.getByTestId("custom-resource-column-cell-ready-for-flux-system/flux")).toBeInTheDocument(),
        { timeout: 300 },
      );
    });

    it("shows the host's rendering of the value in the cell, and the rest of the list", () => {
      expect(result.getByTestId("custom-resource-column-cell-ready-for-flux-system/flux")).toHaveTextContent("True");
      expect(result.getByTestId("custom-resource-column-cell-status-for-flux-system/flux")).toHaveTextContent(
        "Reconciliation finished",
      );
    });

    it("logs the error with the extension's name, the kind and the column", () => {
      expect(loggerStub.error).toHaveBeenCalledWith(
        '[EXTENSIONS]: throwing-extension: the column "Ready" of FluxInstance failed to render, its value is shown instead',
        expect.objectContaining({ message: "some error" }),
      );
    });
  });

  describe("given two enabled extensions name the same column of the same kind and version", () => {
    const otherExtension: FakeExtensionOptions = {
      id: "other-extension-id",
      name: "other-extension",
      rendererOptions: {
        customResourceColumns: [
          columnsFor(FluxInstance, { columns: { Ready: { Render: OtherReadyBadge }, Revision: { hidden: true } } }),
        ],
      },
    };

    beforeEach(async () => {
      await enableExtension(fluxExtension, otherExtension);
    });

    it("uses the registration of the extension registered first", () => {
      const columns = getColumns("FluxInstance", `${group}/v1`);

      expect(columns.get("Ready")).toEqual({ extensionName: "flux-extension", column: { Render: ReadyBadge } });
    });

    it("still uses the columns only the other extension names", () => {
      expect(getColumns("FluxInstance", `${group}/v1`).get("Revision")).toEqual({
        extensionName: "other-extension",
        column: { hidden: true },
      });
    });

    it("logs a warning naming both extensions, once", () => {
      getColumns("FluxInstance", `${group}/v1`);
      getColumns("FluxInstance", `${group}/v1`);

      expect(loggerStub.warn).toHaveBeenCalledTimes(1);
      expect(loggerStub.warn).toHaveBeenCalledWith(
        `[EXTENSIONS]: the column "Ready" of FluxInstance (${group}/v1) is registered by flux-extension and by other-extension; the host uses the one of flux-extension`,
      );
    });
  });

  describe("given an extension sets customResourceColumns to something that is not an array", () => {
    beforeEach(async () => {
      await act(async () => {
        builder.extensions.enable({
          id: "broken-extension-id",
          name: "broken-extension",
          rendererOptions: { customResourceColumns: { kind: "FluxInstance" } as unknown as [] },
        });
      });
    });

    it("rejects the field whole, with an error that names the extension", () => {
      expect(loggerStub.error).toHaveBeenCalledWith(
        "[EXTENSIONS]: broken-extension: customResourceColumns is rejected: it is not an array but an object",
      );
      expect(getColumns("FluxInstance", `${group}/v1`).size).toBe(0);
    });
  });

  describe("given an extension registers an entry that is not a registration next to a valid one", () => {
    beforeEach(async () => {
      await enableExtension({
        id: "broken-extension-id",
        name: "broken-extension",
        rendererOptions: {
          customResourceColumns: [
            { kind: "FluxInstance", apiVersions: [`${group}/v1`], columns: { Ready: {} } } as never,
            "FluxInstance" as never,
            columnsFor(FluxInstance, { columns: { Status: { hidden: true } } }),
          ],
        },
      });
    });

    it("rejects the entries alone, with errors that name the extension and the index", () => {
      expect(loggerStub.error).toHaveBeenCalledWith(
        '[EXTENSIONS]: broken-extension: customResourceColumns[0] (FluxInstance) is rejected: columns["Ready"] has neither "Render" nor "hidden: true"',
      );
      expect(loggerStub.error).toHaveBeenCalledWith(
        "[EXTENSIONS]: broken-extension: customResourceColumns[1] (<no kind>) is rejected: it is not a registration object",
      );
    });

    it("keeps the valid entry", () => {
      expect([...getColumns("FluxInstance", `${group}/v1`).keys()]).toEqual(["Status"]);
    });
  });
});
