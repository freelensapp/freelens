/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { rejectPromiseBy } from "./reject-promise";

describe("rejectPromiseBy", () => {
  it("rejects when the signal aborts", async () => {
    const controller = new AbortController();
    const promise = rejectPromiseBy(controller.signal);

    controller.abort();

    await expect(promise).rejects.toBeDefined();
  });

  it("rejects at once when the signal has already aborted", async () => {
    const controller = new AbortController();

    controller.abort();

    await expect(rejectPromiseBy(controller.signal)).rejects.toBe(controller.signal.reason);
  });
});
