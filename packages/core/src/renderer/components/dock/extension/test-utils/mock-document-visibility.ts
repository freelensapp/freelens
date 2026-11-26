/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";

export function mockDocumentVisibility(initialState: DocumentVisibilityState = "visible") {
  let state = initialState;
  const hidden = vi.spyOn(document, "hidden", "get").mockImplementation(() => state === "hidden");
  const visibilityState = vi.spyOn(document, "visibilityState", "get").mockImplementation(() => state);

  return {
    setState(next: DocumentVisibilityState) {
      if (state === next) return;

      state = next;
      fireEvent(document, new Event("visibilitychange", { bubbles: true }));
    },
    restore() {
      visibilityState.mockRestore();
      hidden.mockRestore();
    },
  };
}
