/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import homeDirectoryPathInjectable from "../../common/os/home-directory-path.injectable";
import showOpenDialogInjectable from "../electron-app/features/show-open-dialog.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import showApplicationWindowInjectable from "../start-main-application/lens-window/show-application-window.injectable";
import askUserForFilePathsInjectable from "./ask-user-for-file-paths.injectable";

import type { Mock } from "vitest";

import type { AskUserForFilePaths } from "./ask-user-for-file-paths.injectable";

describe("ask-user-for-file-paths", () => {
  let askUserForFilePaths: AskUserForFilePaths;
  let showOpenDialogMock: Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    showOpenDialogMock = vi.fn();

    di.override(showApplicationWindowInjectable, () => async () => {});
    di.override(showOpenDialogInjectable, () => showOpenDialogMock);
    di.override(homeDirectoryPathInjectable, () => "/some-home");

    askUserForFilePaths = di.inject(askUserForFilePathsInjectable);
  });

  it("opens the first dialog in the home directory", async () => {
    showOpenDialogMock.mockResolvedValue({ canceled: true, filePaths: [] });

    await askUserForFilePaths({ properties: ["openFile"] });

    expect(showOpenDialogMock).toHaveBeenCalledWith({ properties: ["openFile"], defaultPath: "/some-home" });
  });

  it("keeps the default path given by the caller", async () => {
    showOpenDialogMock.mockResolvedValue({ canceled: true, filePaths: [] });

    await askUserForFilePaths({ defaultPath: "/some-directory" });

    expect(showOpenDialogMock).toHaveBeenCalledWith({ defaultPath: "/some-directory" });
  });

  it("returns the picked paths", async () => {
    showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: ["/some/file"] });

    expect(await askUserForFilePaths({})).toEqual({ canceled: false, paths: ["/some/file"] });
  });

  describe("when the user has picked a path", () => {
    beforeEach(async () => {
      showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: ["/some/picked/file", "/some/other/file"] });

      await askUserForFilePaths({});
      showOpenDialogMock.mockClear();
      showOpenDialogMock.mockResolvedValue({ canceled: true, filePaths: [] });
    });

    it("opens the next dialog in the directory of the first picked path", async () => {
      await askUserForFilePaths({});

      expect(showOpenDialogMock).toHaveBeenCalledWith({ defaultPath: "/some/picked" });
    });

    it("still prefers the default path given by the caller", async () => {
      await askUserForFilePaths({ defaultPath: "/some-directory" });

      expect(showOpenDialogMock).toHaveBeenCalledWith({ defaultPath: "/some-directory" });
    });

    it("keeps the directory when the next dialog is canceled", async () => {
      await askUserForFilePaths({});
      await askUserForFilePaths({});

      expect(showOpenDialogMock).toHaveBeenLastCalledWith({ defaultPath: "/some/picked" });
    });
  });
});
