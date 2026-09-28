/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import asyncFn, { type AsyncFnMock } from "@async-fn/vitest";
import { flushPromises } from "@freelensapp/test-utils";
import askUserForFilePathsInjectable from "../../main/ipc/ask-user-for-file-paths.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import openPathPickingDialogInjectable from "./renderer/pick-paths.injectable";

import type { OpenDialogOptions } from "electron";
import type { Mock } from "vitest";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { PathPickingResponse } from "./common/channel";
import type { OpenPathPickingDialog } from "./renderer/pick-paths.injectable";

describe("opening only one path picking dialog at a time", () => {
  let builder: ApplicationBuilder;
  let askUserForFilePathsMock: AsyncFnMock<(options: OpenDialogOptions) => Promise<PathPickingResponse>>;
  let openPathPickingDialog: OpenPathPickingDialog;
  let onPickMock: Mock;
  let onCancelMock: Mock;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    askUserForFilePathsMock = asyncFn();

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(askUserForFilePathsInjectable, () => askUserForFilePathsMock);
    });

    await builder.render();

    openPathPickingDialog = builder.applicationWindow.only.di.inject(openPathPickingDialogInjectable);

    onPickMock = vi.fn();
    onCancelMock = vi.fn();
  });

  describe("when a dialog is opened", () => {
    beforeEach(async () => {
      openPathPickingDialog({ message: "some-message", onPick: onPickMock, onCancel: onCancelMock });

      await flushPromises();
    });

    it("asks the user for paths", () => {
      expect(askUserForFilePathsMock).toHaveBeenCalledTimes(1);
    });

    describe("when another dialog is opened while the first one is still open", () => {
      beforeEach(async () => {
        openPathPickingDialog({ message: "some-other-message", onPick: onPickMock, onCancel: onCancelMock });

        await flushPromises();
      });

      it("does not ask the user for paths again", () => {
        expect(askUserForFilePathsMock).toHaveBeenCalledTimes(1);
      });

      describe("when the user picks some paths", () => {
        beforeEach(async () => {
          await askUserForFilePathsMock.resolve({ canceled: false, paths: ["/some-path"] });

          await flushPromises();
        });

        it("calls onPick only once, with the picked paths", () => {
          expect(onPickMock.mock.calls).toEqual([[["/some-path"]]]);
        });

        it("does not call onCancel", () => {
          expect(onCancelMock).not.toHaveBeenCalled();
        });

        describe("when a dialog is opened again", () => {
          beforeEach(async () => {
            openPathPickingDialog({ message: "some-message", onPick: onPickMock, onCancel: onCancelMock });

            await flushPromises();
          });

          it("asks the user for paths again", () => {
            expect(askUserForFilePathsMock).toHaveBeenCalledTimes(2);
          });
        });
      });

      describe("when the user cancels the dialog", () => {
        beforeEach(async () => {
          await askUserForFilePathsMock.resolve({ canceled: true });

          await flushPromises();
        });

        it("calls onCancel only once", () => {
          expect(onCancelMock).toHaveBeenCalledTimes(1);
        });

        it("does not call onPick", () => {
          expect(onPickMock).not.toHaveBeenCalled();
        });

        describe("when a dialog is opened again", () => {
          beforeEach(async () => {
            openPathPickingDialog({ message: "some-message", onPick: onPickMock, onCancel: onCancelMock });

            await flushPromises();
          });

          it("asks the user for paths again", () => {
            expect(askUserForFilePathsMock).toHaveBeenCalledTimes(2);
          });
        });
      });
    });
  });

  describe("given the user picked some paths and onPick is still running", () => {
    let onPickAsyncMock: AsyncFnMock<(paths: string[]) => Promise<void>>;

    beforeEach(async () => {
      onPickAsyncMock = asyncFn();

      openPathPickingDialog({ message: "some-message", onPick: onPickAsyncMock });

      await flushPromises();

      await askUserForFilePathsMock.resolve({ canceled: false, paths: ["/some-path"] });

      await flushPromises();
    });

    it("is running onPick", () => {
      expect(onPickAsyncMock).toHaveBeenCalledWith(["/some-path"]);
    });

    describe("when a dialog is opened again", () => {
      beforeEach(async () => {
        openPathPickingDialog({ message: "some-message", onPick: onPickMock, onCancel: onCancelMock });

        await flushPromises();
      });

      it("asks the user for paths again without waiting for the previous onPick", () => {
        expect(askUserForFilePathsMock).toHaveBeenCalledTimes(2);
      });
    });
  });
});
