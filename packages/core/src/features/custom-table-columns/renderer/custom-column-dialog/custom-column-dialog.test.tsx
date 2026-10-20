/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";

import { Pod } from "@freelensapp/kube-object";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { act, fireEvent } from "@testing-library/react";
import directoryForKubeConfigsInjectable from "../../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting } from "../../../../renderer/getDiForUnitTesting";
import customTableColumnsInjectable from "../../common/custom-table-columns.injectable";
import { CustomColumnDialog } from "./custom-column-dialog";
import openCustomColumnDialogInjectable from "./open.injectable";
import customColumnDialogStateInjectable from "./state.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";

import type { CustomColumnDialogParams } from "./state.injectable";

const pod = (name: string, instance: string) =>
  new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name,
      namespace: "default",
      resourceVersion: "1",
      selfLink: `/api/v1/namespaces/default/pods/${name}`,
      uid: `${name}-uid`,
      labels: { "app.kubernetes.io/instance": instance },
    },
  });

describe("custom column dialog", () => {
  let di: DiContainer;
  let result: RenderResult;

  const open = (overrides: Partial<CustomColumnDialogParams> = {}) =>
    act(() => {
      di.inject(openCustomColumnDialogInjectable)({
        kind: "Pod",
        apiVersion: "v1",
        anchors: [
          { id: "name", title: "Name" },
          { id: "age", title: "Age" },
        ],
        getPreviewItems: () => [pod("first", "one"), pod("second", "two")],
        ...overrides,
      });
    });

  const typeInto = (placeholder: string, value: string) => {
    fireEvent.change(result.getByPlaceholderText(placeholder), { target: { value } });
  };

  const typeTitle = (value: string) => typeInto("Instance type", value);
  const typeJsonPath = (value: string) => typeInto(".metadata.labels['node.kubernetes.io/instance-type']", value);

  beforeEach(async () => {
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");

    let addedCount = 0;

    di.override(getRandomIdInjectionToken, () => () => `some-id-${++addedCount}`);

    const render = (await import("../../../../renderer/components/test-utils/renderFor")).renderFor(di);

    result = render(<CustomColumnDialog />);
  });

  it("is closed until it is opened", () => {
    expect(result.queryByText("Add a column to Pod")).not.toBeInTheDocument();
  });

  describe("when opened", () => {
    beforeEach(() => {
      open();
    });

    it("names the resource the column is added to", () => {
      expect(result.getByText("Add a column to Pod")).toBeInTheDocument();
    });

    it("asks for an expression before previewing", () => {
      expect(result.getByText("Type an expression to see what it produces.")).toBeInTheDocument();
    });

    it("cannot be saved while it is empty", () => {
      expect(result.getByTestId("save-custom-column")).toBeDisabled();
    });

    describe("given a name and an expression", () => {
      beforeEach(() => {
        typeTitle("Instance");
        typeJsonPath(".metadata.labels['app.kubernetes.io/instance']");
      });

      it("previews the value for each item of the list", () => {
        const preview = result.getByTestId("custom-column-preview");

        expect(preview).toHaveTextContent("first");
        expect(preview).toHaveTextContent("one");
        expect(preview).toHaveTextContent("second");
        expect(preview).toHaveTextContent("two");
      });

      it("can be saved", () => {
        expect(result.getByTestId("save-custom-column")).not.toBeDisabled();
      });

      it("stores the column for the resource of the list", () => {
        fireEvent.click(result.getByTestId("save-custom-column"));

        expect(di.inject(customTableColumnsInjectable).get()).toEqual([
          expect.objectContaining({
            kind: "Pod",
            apiVersion: "v1",
            title: "Instance",
            jsonPath: ".metadata.labels['app.kubernetes.io/instance']",
            after: undefined,
          }),
        ]);
      });

      it("closes once saved", () => {
        fireEvent.click(result.getByTestId("save-custom-column"));

        expect(di.inject(customColumnDialogStateInjectable).get()).toBeUndefined();
      });
    });

    describe("given an expression that is not a path", () => {
      beforeEach(() => {
        typeTitle("Broken");
        typeJsonPath(".metadata[");
      });

      it("says so, once the field settles", async () => {
        expect(await result.findByText("Not a valid JSONPath expression")).toBeInTheDocument();
      });

      it("cannot be saved", () => {
        expect(result.getByTestId("save-custom-column")).toBeDisabled();
      });
    });
  });

  describe("given a column already exists for the resource", () => {
    beforeEach(() => {
      open();
      typeTitle("Instance");
      typeJsonPath(".metadata.labels['app.kubernetes.io/instance']");
      fireEvent.click(result.getByTestId("save-custom-column"));
      open();
    });

    it("lists it", () => {
      expect(result.getByTestId("custom-column-list")).toHaveTextContent("Instance");
    });

    it("removes it when asked", () => {
      fireEvent.click(result.getByTestId("remove-custom-column-custom-column:some-id-1"));

      expect(di.inject(customTableColumnsInjectable).get()).toEqual([]);
    });

    it("edits it in place rather than adding another", () => {
      fireEvent.click(result.getByTestId("edit-custom-column-custom-column:some-id-1"));
      typeTitle("Renamed");
      fireEvent.click(result.getByTestId("save-custom-column"));

      const columns = di.inject(customTableColumnsInjectable).get();

      expect(columns).toHaveLength(1);
      expect(columns[0].title).toBe("Renamed");
    });
  });
});
