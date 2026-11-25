/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { noop } from "es-toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { Logger } from "@freelensapp/logger";

import type { RenderResult } from "@testing-library/react";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";

// The host registers every extension in one loop, and every registrator of an
// extension in another. A registrator that throws on a malformed field must
// cost that field of that extension alone.

const getStatusBarItems = (text: string) => [
  {
    components: {
      Item: () => <div data-testid="extension-status-bar-item">{text}</div>,
      position: "right" as const,
    },
  },
];

const brokenExtension: FakeExtensionOptions = {
  id: "broken-extension-id",
  name: "broken-extension",
  rendererOptions: {
    // Not an array, so the registrator of the field throws on it.
    entitySettings: null as unknown as [],
    statusBarItems: getStatusBarItems("from-broken-extension"),
  },
};

const nextExtension: FakeExtensionOptions = {
  id: "next-extension-id",
  name: "next-extension",
  rendererOptions: {
    statusBarItems: getStatusBarItems("from-next-extension"),
  },
};

describe("an extension whose registrator throws on one of its fields", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let loggerStub: Logger;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    loggerStub = {
      error: vi.fn(),
      debug: noop,
      info: noop,
      silly: noop,
      warn: noop,
    };

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.unoverride(getRandomIdInjectionToken);
      windowDi.permitSideEffects(getRandomIdInjectionToken);
      windowDi.override(loggerInjectionToken, () => loggerStub);
    });

    rendered = await builder.render();

    builder.extensions.enable(brokenExtension, nextExtension);
  });

  it("logs the failure with the extension's name and the registrator", () => {
    expect(loggerStub.error).toHaveBeenCalledWith(
      '[EXTENSIONS]: broken-extension: registrator "entity-setting-extension-registrator" failed and is skipped',
      expect.any(TypeError),
    );
  });

  it("still registers the extension's other fields", () => {
    const texts = rendered.getAllByTestId("extension-status-bar-item").map((item) => item.textContent);

    expect(texts).toContain("from-broken-extension");
  });

  it("still registers the extensions after it", () => {
    const texts = rendered.getAllByTestId("extension-status-bar-item").map((item) => item.textContent);

    expect(texts).toContain("from-next-extension");
  });
});
