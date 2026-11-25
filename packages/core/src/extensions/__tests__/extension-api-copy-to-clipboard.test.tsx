/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { renderFor } from "../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import { Renderer } from "../extension-api";

import type { Mock } from "vitest";

import type { DiRender } from "../../renderer/components/test-utils/renderFor";

// The copy controls as an extension renders them, through `Renderer.Component`.
describe("the copy controls of Renderer.Component", () => {
  const { CopyToClipboardIcon, CopyableInput, CopyableMonacoEditor } = Renderer.Component;
  let render: DiRender;
  let writeText: Mock<(text: string) => Promise<void>>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-data");
    render = renderFor(di);
    writeText = vi.fn(async () => {});

    // jsdom has no Clipboard API.
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies the text CopyToClipboardIcon is given, under its global class", async () => {
    const result = render(<CopyToClipboardIcon getText={() => "some-text"} data-testid="copy" />);
    const icon = result.getByTestId("copy");

    expect(icon).toHaveClass("CopyToClipboardIcon");

    await act(async () => icon.click());

    expect(writeText).toHaveBeenCalledWith("some-text");
    expect(icon).toHaveAttribute("aria-label", "Copied!");
  });

  it("copies what CopyableMonacoEditor shows, an unsaved edit included, under its global classes", async () => {
    const onChange = vi.fn();
    const result = render(
      <CopyableMonacoEditor id="some-id" value="some-value" onChange={onChange} data-testid="editor" />,
    );

    expect(result.getByTestId("editor")).toHaveClass("CopyableMonacoEditor");
    expect(result.getByTestId("editor-copy")).toHaveClass("CopyToClipboardIcon");

    fireEvent.change(result.getByTestId("monaco-editor-for-some-id"), { target: { value: "some-edit" } });
    await act(async () => result.getByTestId("editor-copy").click());

    expect(writeText).toHaveBeenCalledWith("some-edit");
    expect(onChange).toHaveBeenCalledWith("some-edit", expect.anything());
  });

  it("copies what CopyableInput shows, or what getTextToCopy makes of it, under its global class", async () => {
    const result = render(
      <CopyableInput value="c29tZS12YWx1ZQ==" getTextToCopy={(value) => atob(value)} data-testid="input" />,
    );

    expect(result.getByTestId("input")).toHaveClass("CopyableInput");

    await act(async () => result.getByTestId("input-copy").click());

    expect(writeText).toHaveBeenCalledWith("some-value");
  });
});
