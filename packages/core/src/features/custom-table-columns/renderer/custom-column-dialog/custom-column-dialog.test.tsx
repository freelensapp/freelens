/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";

import { Pod } from "@freelensapp/kube-object";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { act, fireEvent, waitFor } from "@testing-library/react";
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
      labels: instance ? { "app.kubernetes.io/instance": instance } : {},
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

  // The wizard debounces its submit, so saving is never done by the time the click returns.
  const save = async () => {
    fireEvent.click(result.getByTestId("save-custom-column"));

    await waitFor(() => expect(di.inject(customColumnDialogStateInjectable).get()).toBeUndefined());
  };

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

    it("shows the rows it will preview against before an expression is given", () => {
      const preview = result.getByTestId("custom-column-preview");

      expect(preview).toHaveTextContent("first");
      expect(preview).toHaveTextContent("waiting for an expression");
    });

    it("counts the rows before an expression is given, so the caption does not appear later", () => {
      expect(result.getByText("2 of 2 items")).toBeInTheDocument();
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

      it("stores the column for the resource of the list", async () => {
        await save();

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

      it("closes once saved", async () => {
        await save();

        expect(di.inject(customColumnDialogStateInjectable).get()).toBeUndefined();
      });
    });

    describe("clicking a preview row", () => {
      const firstRow = () => result.getByTestId("custom-column-preview").firstElementChild as HTMLElement;

      it("opens it up so a long value can be read in full", () => {
        expect(firstRow()).toHaveAttribute("title", "Click to read in full");

        fireEvent.click(firstRow());

        expect(firstRow()).not.toHaveAttribute("title");
      });

      it("closes it again", () => {
        fireEvent.click(firstRow());
        fireEvent.click(firstRow());

        expect(firstRow()).toHaveAttribute("title", "Click to read in full");
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

  describe("given only a later item of the list has the value", () => {
    beforeEach(() => {
      open({
        getPreviewItems: () => [
          pod("no-label-1", ""),
          pod("no-label-2", ""),
          pod("no-label-3", ""),
          pod("no-label-4", ""),
          pod("no-label-5", ""),
          pod("has-label", "the-one"),
        ],
      });
      typeJsonPath(".metadata.labels['app.kubernetes.io/instance']");
    });

    it("previews that item rather than only the first rows", () => {
      expect(result.getByTestId("custom-column-preview")).toHaveTextContent("the-one");
    });

    it("puts it first", () => {
      const rows = result.getByTestId("custom-column-preview").children;

      expect(rows[0]).toHaveTextContent("has-label");
    });

    it("still shows items without a value, so a matching expression is told apart", () => {
      expect(result.getByTestId("custom-column-preview")).toHaveTextContent("no value");
    });

    it("says how many items have one", () => {
      expect(result.getByText("1 of 6 items have a value")).toBeInTheDocument();
    });
  });

  describe("given a column already exists for the resource", () => {
    beforeEach(async () => {
      open();
      typeTitle("Instance");
      typeJsonPath(".metadata.labels['app.kubernetes.io/instance']");
      await save();
      open();
    });

    it("lists it", () => {
      expect(result.getByTestId("custom-column-list")).toHaveTextContent("Instance");
    });

    it("removes it when asked", () => {
      fireEvent.click(result.getByTestId("remove-custom-column-custom-column:some-id-1"));

      expect(di.inject(customTableColumnsInjectable).get()).toEqual([]);
    });

    it("edits it in place rather than adding another", async () => {
      fireEvent.click(result.getByTestId("edit-custom-column-custom-column:some-id-1"));
      typeTitle("Renamed");
      await save();

      const columns = di.inject(customTableColumnsInjectable).get();

      expect(columns).toHaveLength(1);
      expect(columns[0].title).toBe("Renamed");
    });
  });
});
