/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { logFailedLoad } from "../log-failed-load";

import type { Logger } from "@freelensapp/logger";

describe("logFailedLoad", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
      warn: vi.fn(),
    };
  });

  it("logs a failure of the main frame as a failure of the window", () => {
    logFailedLoad(logger, "some-window", {
      code: -105,
      desc: "ERR_NAME_NOT_RESOLVED",
      url: "http://localhost/",
      isMainFrame: true,
    });

    expect(logger.error).toHaveBeenCalledWith('[CREATE-ELECTRON-WINDOW]: Failed to load window "some-window"', {
      code: -105,
      desc: "ERR_NAME_NOT_RESOLVED",
      url: "http://localhost/",
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it("logs an aborted load of a subframe below info, with its url", () => {
    logFailedLoad(logger, "some-window", {
      code: -3,
      desc: "",
      url: "http://some-cluster.renderer.freelens.app/",
      isMainFrame: false,
    });

    expect(logger.debug).toHaveBeenCalledWith(
      '[CREATE-ELECTRON-WINDOW]: Aborted load of a frame of window "some-window"',
      {
        code: -3,
        desc: "",
        url: "http://some-cluster.renderer.freelens.app/",
      },
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("logs any other failure of a subframe as a warning, with its url", () => {
    logFailedLoad(logger, "some-window", {
      code: -102,
      desc: "ERR_CONNECTION_REFUSED",
      url: "http://some-cluster.renderer.freelens.app/",
      isMainFrame: false,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      '[CREATE-ELECTRON-WINDOW]: Failed to load a frame of window "some-window"',
      {
        code: -102,
        desc: "ERR_CONNECTION_REFUSED",
        url: "http://some-cluster.renderer.freelens.app/",
      },
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
