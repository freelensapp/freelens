/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { Drawer } from "./drawer";

import type { RenderResult } from "@testing-library/react";
import type { Mock } from "vitest";

describe("<Drawer />", () => {
  let result: RenderResult;
  let onClose: () => void;

  beforeEach(() => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    onClose = vi.fn();
    result = render(
      <>
        <button type="button" data-testid="outside" />
        <Drawer open title="Some title" onClose={onClose}>
          <button type="button" data-testid="inside" />
        </Drawer>
      </>,
    );
  });

  it("closes on a click outside", () => {
    result.getByTestId("outside").click();

    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on a click inside", () => {
    result.getByTestId("inside").click();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on a click whose target is detached before the click reaches window", () => {
    const replaced = document.createElement("button");

    document.body.append(replaced);
    replaced.addEventListener("click", () => replaced.remove());
    replaced.click();

    expect(onClose).not.toHaveBeenCalled();
  });

  describe("copying the title", () => {
    let writeTextMock: Mock<(text: string) => Promise<void>>;

    beforeEach(() => {
      writeTextMock = vi.fn(async () => {});

      // jsdom has no Clipboard API.
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: writeTextMock },
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, "clipboard");
    });

    it("copies the whole title when it has no kind", async () => {
      await act(async () => result.getByLabelText("Copy").click());

      expect(writeTextMock).toHaveBeenCalledWith("Some title");
      expect(result.getByLabelText("Copied!")).toBeInTheDocument();
    });

    it("copies the name after the kind", async () => {
      result.rerender(
        <Drawer open title="Pod: some-pod" onClose={onClose}>
          <button type="button" data-testid="inside" />
        </Drawer>,
      );

      await act(async () => result.getByLabelText("Copy").click());

      expect(writeTextMock).toHaveBeenCalledWith("some-pod");
    });
  });
});
