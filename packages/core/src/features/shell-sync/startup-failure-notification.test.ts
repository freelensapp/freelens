/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { flushPromises } from "@freelensapp/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import broadcastThatRootFrameIsRenderedInjectable from "../../renderer/frames/root-frame/broadcast-that-root-frame-is-rendered.injectable";
import computeShellEnvironmentInjectable from "./main/compute-shell-environment.injectable";

import type { Mock } from "vitest";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { ComputeShellEnvironment } from "./main/compute-shell-environment.injectable";

describe("shell sync failure at startup", () => {
  let builder: ApplicationBuilder;
  let showErrorNotificationMock: Mock;

  const startWith = async (computeShellEnvironment: ComputeShellEnvironment) => {
    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(computeShellEnvironmentInjectable, () => computeShellEnvironment);
    });

    await builder.render();
    await flushPromises();
  };

  beforeEach(() => {
    builder = getApplicationBuilder();
    showErrorNotificationMock = vi.fn();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(showErrorNotificationInjectable, () => showErrorNotificationMock);
    });
  });

  describe("given shell sync fails", () => {
    beforeEach(async () => {
      await startWith(async () => ({
        callWasSuccessful: false,
        error: "some-shell-sync-error",
      }));
    });

    it("shows the failure once the application window has rendered", () => {
      expect(showErrorNotificationMock).toHaveBeenCalledExactlyOnceWith(
        "Failed to sync shell environment: some-shell-sync-error",
      );
    });

    it("does not show the failure again when the root frame becomes ready a second time", async () => {
      const broadcastThatRootFrameIsRendered = builder.applicationWindow.only.di.inject(
        broadcastThatRootFrameIsRenderedInjectable,
      );

      broadcastThatRootFrameIsRendered();
      await flushPromises();

      expect(showErrorNotificationMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("given shell sync succeeds", () => {
    beforeEach(async () => {
      await startWith(async () => ({
        callWasSuccessful: true,
        // No environment to apply, so the test leaves process.env alone
        response: undefined,
      }));
    });

    it("shows no notification", () => {
      expect(showErrorNotificationMock).not.toHaveBeenCalled();
    });
  });
});
