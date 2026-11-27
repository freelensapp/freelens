/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { noop } from "es-toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import customResourceColumnsOfExtensionsInjectable from "../custom-resource-columns-of-extensions.injectable";
import { CustomResourceDetails } from "../details";

import type { Logger } from "@freelensapp/logger";

import type { DiRender } from "../../test-utils/renderFor";
import type { ColumnOfExtension } from "../custom-resource-columns-of-extensions.injectable";
import type { CustomResourceColumnProps } from "../custom-resource-columns-registration";

const group = "fluxcd.controlplane.io";

const crd = new CustomResourceDefinition({
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: {
    name: `fluxinstances.${group}`,
    resourceVersion: "1",
    selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/fluxinstances.${group}`,
    uid: "1",
  },
  spec: {
    group,
    names: { kind: "FluxInstance", plural: "fluxinstances" },
    scope: "Namespaced",
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
      {
        name: "v1beta1",
        served: true,
        storage: false,
        additionalPrinterColumns: [{ name: "Phase", jsonPath: ".status.phase", type: "string" }],
      },
    ],
  },
});

const getFluxInstance = (apiVersion: string) =>
  new KubeObject({
    apiVersion,
    kind: "FluxInstance",
    metadata: {
      name: "flux",
      namespace: "flux-system",
      resourceVersion: "1",
      selfLink: `/apis/${apiVersion}/namespaces/flux-system/fluxinstances/flux`,
      uid: "flux-uid",
    },
    status: {
      conditions: [{ type: "Ready", status: "True", message: "Reconciliation finished" }],
      lastAppliedRevision: "v2.4.0@sha256:0123456789abcdef",
      phase: "Running",
    },
  } as never);

const ReadyBadge = ({ value, column }: CustomResourceColumnProps) => (
  <span data-testid="ready-badge">{`${column.name} badge: ${String(value)}`}</span>
);

const Throwing = (_props: CustomResourceColumnProps) => {
  throw new Error("some error");
};

describe("<CustomResourceDetails /> with the columns of extensions", () => {
  let render: DiRender;
  let columnsOfExtensions: Map<string, Map<string, ColumnOfExtension>>;
  let logger: Logger;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    columnsOfExtensions = new Map();
    logger = { error: vi.fn(), warn: vi.fn(), debug: noop, info: noop, silly: noop };

    di.override(
      customResourceColumnsOfExtensionsInjectable,
      () => (kind, apiVersion) => columnsOfExtensions.get(`${kind} ${apiVersion}`) ?? new Map(),
    );
    di.override(loggerInjectionToken, () => logger);

    render = renderFor(di);
  });

  // The printer columns by name, without the conditions drawer that follows them.
  const getColumnValues = (container: HTMLElement) =>
    Object.fromEntries(
      Array.from(container.querySelectorAll(".CustomResourceDetails > .DrawerItem:not(.conditions)"), (item) => [
        item.querySelector(".name")?.textContent,
        item.querySelector(".value")?.textContent,
      ]),
    );

  const registerColumns = (apiVersion: string, columns: Record<string, ColumnOfExtension["column"]>) =>
    columnsOfExtensions.set(
      `FluxInstance ${apiVersion}`,
      new Map(Object.entries(columns).map(([name, column]) => [name, { extensionName: "flux-extension", column }])),
    );

  it("shows every printer column as the host renders it without registrations", () => {
    const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1`)} />);

    expect(getColumnValues(result.container)).toEqual({
      Ready: "True",
      Status: "Reconciliation finished",
      Revision: "v2.4.0@sha256:0123456789abcdef",
    });
  });

  describe("given an extension hides a column and renders another", () => {
    beforeEach(() => {
      registerColumns(`${group}/v1`, {
        Ready: { Render: ReadyBadge },
        Status: { hidden: true },
        Missing: { hidden: true },
      });
    });

    it("renders the registered column with the extension's component, with the value and the column", () => {
      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1`)} />);

      expect(getColumnValues(result.container).Ready).toBe("Ready badge: True");
      expect(result.getByTestId("ready-badge")).toBeInTheDocument();
    });

    it("keeps the conditions drawer", () => {
      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1`)} />);

      expect(result.container.querySelector(".DrawerItem.conditions")).toHaveTextContent("Reconciliation finished");
    });

    it("leaves out the hidden column", () => {
      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1`)} />);

      expect(Object.keys(getColumnValues(result.container))).not.toContain("Status");
    });

    it("shows a column the registration does not name as before, and ignores one the CRD does not have", () => {
      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1`)} />);

      expect(getColumnValues(result.container)).toEqual({
        Ready: "Ready badge: True",
        Revision: "v2.4.0@sha256:0123456789abcdef",
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("does not apply the registration to an object of another version", () => {
      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1beta1`)} />);

      expect(result.queryByTestId("ready-badge")).not.toBeInTheDocument();
    });
  });

  describe("given an extension renders a column with a component that throws", () => {
    beforeEach(() => {
      registerColumns(`${group}/v1`, { Ready: { Render: Throwing } });
      vi.spyOn(console, "error").mockImplementation(noop);
    });

    it("shows the host's rendering of the value instead, and the rest of the details", () => {
      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1`)} />);

      expect(getColumnValues(result.container)).toEqual({
        Ready: "True",
        Status: "Reconciliation finished",
        Revision: "v2.4.0@sha256:0123456789abcdef",
      });
    });

    it("logs the error with the extension's name, the kind and the column", () => {
      render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1`)} />);

      expect(logger.error).toHaveBeenCalledWith(
        '[EXTENSIONS]: flux-extension: the column "Ready" of FluxInstance failed to render, its value is shown instead',
        expect.objectContaining({ message: "some error" }),
      );
    });
  });

  describe("given an object of a version that is not the preferred one", () => {
    it("shows the printer columns of the object's version", () => {
      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1beta1`)} />);

      expect(getColumnValues(result.container)).toEqual({ Phase: "Running" });
    });

    it("applies the registration of that version", () => {
      registerColumns(`${group}/v1beta1`, { Phase: { hidden: true } });

      const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v1beta1`)} />);

      expect(getColumnValues(result.container)).toEqual({});
    });
  });

  it("shows the columns of the preferred version for an object of a version the CRD does not list", () => {
    const result = render(<CustomResourceDetails crd={crd} object={getFluxInstance(`${group}/v2`)} />);

    expect(Object.keys(getColumnValues(result.container))).toEqual(["Ready", "Status", "Revision"]);
  });
});
