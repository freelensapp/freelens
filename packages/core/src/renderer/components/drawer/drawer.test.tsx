/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { Drawer } from "./drawer";

import type { RenderResult } from "@testing-library/react";

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
});
