/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { act, waitFor } from "@testing-library/react";
import { noop } from "es-toolkit";
import { autorun } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LensExtensionKubeObject } from "../../extensions/common-api/k8s-api";
import { columnsFor } from "../../extensions/renderer-api/kube-object-registrations";
import customResourceColumnsOfExtensionsInjectable from "../../renderer/components/custom-resources/custom-resource-columns-of-extensions.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { Logger } from "@freelensapp/logger";

import type { DiContainer } from "@ogre-tools/injectable";

import type { CustomResourceColumnProps } from "../../renderer/components/custom-resources/custom-resource-columns-registration";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";

const group = "fluxcd.controlplane.io";

class FluxInstance extends LensExtensionKubeObject {
  static readonly kind = "FluxInstance";
  static readonly namespaced = true;
  static readonly crd = { apiVersions: [`${group}/v1`], plural: "fluxinstances", singular: "fluxinstance" };
}

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

    await builder.render();
    windowDi = builder.applicationWindow.only.di;
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

    it("drops them when the extension is disabled", async () => {
      await act(async () => {
        builder.extensions.disable(fluxExtension);
      });

      expect(getColumns("FluxInstance", `${group}/v1`).size).toBe(0);
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
