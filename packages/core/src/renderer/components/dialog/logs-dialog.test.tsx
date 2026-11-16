/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showCheckedErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { LogsDialog } from "./logs-dialog";

import type { RenderResult } from "@testing-library/react";
import type { Mock } from "vitest";

describe("LogsDialog", () => {
  let result: RenderResult;
  let writeTextMock: Mock<(text: string) => Promise<void>>;
  let showSuccessNotificationMock: Mock;
  let showCheckedErrorNotificationMock: Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    writeTextMock = vi.fn();
    showSuccessNotificationMock = vi.fn();
    showCheckedErrorNotificationMock = vi.fn();

    // jsdom has no Clipboard API.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    di.override(showSuccessNotificationInjectable, () => showSuccessNotificationMock);
    di.override(showCheckedErrorNotificationInjectable, () => showCheckedErrorNotificationMock);

    result = render(<LogsDialog title="Some Title" logs="some-logs" isOpen={true} />);
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });

  describe("when the clipboard accepts the write", () => {
    beforeEach(async () => {
      writeTextMock.mockResolvedValue(undefined);

      await act(async () => {
        result.getByText("Copy to clipboard").click();
      });
    });

    it("writes the logs to the clipboard", () => {
      expect(writeTextMock).toHaveBeenCalledWith("some-logs");
    });

    it("shows a success notification", () => {
      expect(showSuccessNotificationMock).toHaveBeenCalledWith("Logs copied to clipboard.");
    });

    it("shows no error notification", () => {
      expect(showCheckedErrorNotificationMock).not.toHaveBeenCalled();
    });
  });

  describe("when the clipboard refuses the write", () => {
    const error = new Error("Document is not focused.");

    beforeEach(async () => {
      writeTextMock.mockRejectedValue(error);

      await act(async () => {
        result.getByText("Copy to clipboard").click();
      });
    });

    it("shows no success notification", () => {
      expect(showSuccessNotificationMock).not.toHaveBeenCalled();
    });

    it("shows an error notification", () => {
      expect(showCheckedErrorNotificationMock).toHaveBeenCalledWith(error, "Failed to copy logs to clipboard");
    });
  });
});
