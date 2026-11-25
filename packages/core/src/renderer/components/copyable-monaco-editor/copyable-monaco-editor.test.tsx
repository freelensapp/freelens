/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { CopyableMonacoEditor } from "./copyable-monaco-editor";

import type { RenderResult } from "@testing-library/react";
import type { Mock } from "vitest";

import type { DiRender } from "../test-utils/renderFor";

describe("<CopyableMonacoEditor />", () => {
  let render: DiRender;
  let result: RenderResult;
  let writeTextMock: Mock<(text: string) => Promise<void>>;
  let onChange: Mock<(value: string) => void>;

  const copy = async () => {
    await act(async () => {
      result.getByTestId("editor-copy").click();
    });
  };

  beforeEach(() => {
    render = renderFor(getDiForUnitTesting());
    writeTextMock = vi.fn(async () => {});
    onChange = vi.fn();

    // jsdom has no Clipboard API.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    result = render(<CopyableMonacoEditor id="some-id" value="some-value" onChange={onChange} data-testid="editor" />);
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies the content of the editor", async () => {
    await copy();

    expect(writeTextMock).toHaveBeenCalledWith("some-value");
  });

  it("shows that the content was copied", async () => {
    await copy();

    expect(result.getByTestId("editor-copy")).toHaveAttribute("aria-label", "Copied!");
  });

  it("copies an unsaved edit, and still reports it", async () => {
    fireEvent.change(result.getByTestId("monaco-editor-for-some-id"), { target: { value: "some-edit" } });

    await copy();

    expect(onChange).toHaveBeenCalledWith("some-edit", expect.anything());
    expect(writeTextMock).toHaveBeenCalledWith("some-edit");
  });

  it("copies a new value given to the editor after an edit", async () => {
    fireEvent.change(result.getByTestId("monaco-editor-for-some-id"), { target: { value: "some-edit" } });
    result.rerender(<CopyableMonacoEditor id="some-id" value="some-new-value" data-testid="editor" />);

    await copy();

    expect(writeTextMock).toHaveBeenCalledWith("some-new-value");
  });
});
