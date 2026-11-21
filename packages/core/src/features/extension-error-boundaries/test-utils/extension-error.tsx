/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { noop } from "es-toolkit";
import { expect, vi } from "vitest";

import type { Logger } from "@freelensapp/logger";

import type { Mock } from "vitest";

import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";

export const extensionName = "some-extension-name";
export const errorMessage = "some-error-of-the-extension";

/**
 * A component of an extension that throws while React renders it.
 */
export const Broken = (): never => {
  throw new Error(errorMessage);
};

export type LoggerStub = Logger & { error: Mock };

/**
 * Replaces the logger of the window, and silences the report of React on the console, for every error a boundary
 * catches. Also gives the registrations of a field distinct ids, which the fake of the random id does not.
 */
export const stubLogger = (builder: ApplicationBuilder): LoggerStub => {
  const logger: LoggerStub = {
    error: vi.fn(),
    debug: noop,
    info: noop,
    silly: noop,
    warn: noop,
  };

  vi.spyOn(console, "error").mockImplementation(noop);

  builder.beforeWindowStart(({ windowDi }) => {
    windowDi.unoverride(getRandomIdInjectionToken);
    windowDi.permitSideEffects(getRandomIdInjectionToken);
    windowDi.override(loggerInjectionToken, () => logger);
  });

  return logger;
};

/**
 * Expects the log line of a boundary that caught the error of the component, with the name of the extension, the
 * field and the component stack.
 */
export const expectLoggedRenderError = (logger: LoggerStub, field: string, component = "Broken") => {
  expect(logger.error).toHaveBeenCalledWith(
    `[EXTENSIONS]: ${extensionName}: a component of "${field}" failed to render and is replaced`,
    expect.objectContaining({ message: errorMessage }),
    expect.stringMatching(new RegExp(`^Component stack:[\\s\\S]*\\b${component}\\b`)),
  );
};
