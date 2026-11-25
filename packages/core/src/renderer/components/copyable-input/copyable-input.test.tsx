/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { CopyableInput } from "./copyable-input";

import type { RenderResult } from "@testing-library/react";
import type { Mock } from "vitest";

import type { DiRender } from "../test-utils/renderFor";

describe("<CopyableInput />", () => {
  let render: DiRender;
  let writeText: Mock<(text: string) => Promise<void>>;

  const copy = async (result: RenderResult) => {
    await act(async () => {
      result.getByTestId("input-copy").click();
    });
  };

  beforeEach(() => {
    render = renderFor(getDiForUnitTesting());
    writeText = vi.fn(async () => {});

    // jsdom has no Clipboard API.
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies the value of the input", async () => {
    const result = render(<CopyableInput value="some-value" data-testid="input" />);

    await copy(result);

    expect(writeText).toHaveBeenCalledWith("some-value");
    expect(result.getByTestId("input-copy")).toHaveAttribute("aria-label", "Copied!");
  });

  it("copies an unsaved edit, and still reports it", async () => {
    const onChange = vi.fn();
    const result = render(<CopyableInput defaultValue="some-value" onChange={onChange} data-testid="input" />);

    // An uncontrolled input reports an edit once it has validated it.
    await act(async () => {
      fireEvent.change(result.getByRole("textbox"), { target: { value: "some-edit" } });
    });
    await copy(result);

    expect(writeText).toHaveBeenCalledWith("some-edit");
    expect(onChange).toHaveBeenCalledWith("some-edit", expect.anything());
  });

  it("copies a new value given after an edit", async () => {
    const result = render(<CopyableInput value="some-value" data-testid="input" />);

    fireEvent.change(result.getByRole("textbox"), { target: { value: "some-edit" } });
    result.rerender(<CopyableInput value="some-new-value" data-testid="input" />);
    await copy(result);

    expect(writeText).toHaveBeenCalledWith("some-new-value");
  });

  it("copies the text that getTextToCopy makes of the value", async () => {
    const result = render(
      <CopyableInput value="some-value" getTextToCopy={(value) => value.toUpperCase()} data-testid="input" />,
    );

    await copy(result);

    expect(writeText).toHaveBeenCalledWith("SOME-VALUE");
  });

  it("shows its children between the input and the copy icon", () => {
    const result = render(
      <CopyableInput value="some-value" data-testid="input">
        <span data-testid="some-child" />
      </CopyableInput>,
    );
    const wrapper = result.getByTestId("input");

    expect(wrapper).toHaveClass("CopyableInput");
    const children = [...wrapper.children];
    const childIndex = children.indexOf(result.getByTestId("some-child"));

    expect(wrapper.firstElementChild).toHaveClass("CopyableInput-input");
    expect(childIndex).toBeGreaterThan(0);
    expect(children.indexOf(result.getByTestId("input-copy"))).toBeGreaterThan(childIndex);
  });
});
