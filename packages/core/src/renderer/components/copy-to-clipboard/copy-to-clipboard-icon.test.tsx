/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { CopyToClipboardIcon, copiedFeedbackDuration } from "./copy-to-clipboard-icon";

import type { RenderResult } from "@testing-library/react";
import type { Mock } from "vitest";

describe("<CopyToClipboardIcon />", () => {
  let result: RenderResult;
  let writeTextMock: Mock<(text: string) => Promise<void>>;
  let getText: Mock<() => string>;

  beforeEach(() => {
    const render = renderFor(getDiForUnitTesting());

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    writeTextMock = vi.fn();
    getText = vi.fn(() => "some-text");

    // jsdom has no Clipboard API.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    result = render(<CopyToClipboardIcon getText={getText} data-testid="copy" />);
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("offers to copy", () => {
    expect(result.getByTestId("copy")).toHaveAttribute("aria-label", "Copy");
    expect(result.getByTestId("copy").querySelector("[data-icon-name]")).toHaveAttribute(
      "data-icon-name",
      "content_copy",
    );
  });

  describe("when the clipboard accepts the write", () => {
    beforeEach(async () => {
      writeTextMock.mockResolvedValue(undefined);

      await act(async () => {
        result.getByTestId("copy").click();
      });
    });

    it("writes the text to the clipboard", () => {
      expect(writeTextMock).toHaveBeenCalledWith("some-text");
    });

    it("shows that the text was copied", () => {
      expect(result.getByTestId("copy")).toHaveAttribute("aria-label", "Copied!");
      expect(result.getByTestId("copy").querySelector("[data-icon-name]")).toHaveAttribute("data-icon-name", "done");
    });

    it("offers to copy again after a few seconds", () => {
      act(() => {
        vi.advanceTimersByTime(copiedFeedbackDuration);
      });

      expect(result.getByTestId("copy")).toHaveAttribute("aria-label", "Copy");
    });

    it("reads the text again on the next click", async () => {
      getText.mockReturnValue("some-other-text");

      await act(async () => {
        result.getByTestId("copy").click();
      });

      expect(writeTextMock).toHaveBeenLastCalledWith("some-other-text");
    });
  });

  describe("when the clipboard refuses the write", () => {
    beforeEach(async () => {
      writeTextMock.mockRejectedValue(new Error("Document is not focused."));

      await act(async () => {
        result.getByTestId("copy").click();
      });
    });

    it("keeps offering to copy", () => {
      expect(result.getByTestId("copy")).toHaveAttribute("aria-label", "Copy");
    });
  });
});
