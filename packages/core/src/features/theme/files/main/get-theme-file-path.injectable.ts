/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import getAbsolutePathInjectable from "../../../../common/path/get-absolute-path.injectable";
import getBasenameOfPathInjectable from "../../../../common/path/get-basename.injectable";
import getDirnameOfPathInjectable from "../../../../common/path/get-dirname.injectable";
import themesDirectoryInjectable from "./themes-directory.injectable";

/**
 * The path of a file directly in the themes directory. Throws for a file name that resolves to
 * anything else (`..`, `.`, an absolute path), or that has a separator or a NUL byte, so that a
 * write or a remove never leaves the directory, whatever the name was checked against before.
 */
export type GetThemeFilePath = (fileName: string) => string;

const getThemeFilePathInjectable = getInjectable({
  id: "get-theme-file-path",
  instantiate: (di): GetThemeFilePath => {
    const themesDirectory = di.inject(themesDirectoryInjectable);
    const getAbsolutePath = di.inject(getAbsolutePathInjectable);
    const getBasename = di.inject(getBasenameOfPathInjectable);
    const getDirname = di.inject(getDirnameOfPathInjectable);

    return (fileName) => {
      const refuse = () => new Error(`${JSON.stringify(fileName)} is not a file of the themes directory`);

      // Both separators, on every platform: a backslash is a separator on Windows only, but a
      // theme file name never has one.
      if (typeof fileName !== "string" || ["\0", "/", "\\"].some((character) => fileName.includes(character))) {
        throw refuse();
      }

      const directory = getAbsolutePath(themesDirectory);
      const filePath = getAbsolutePath(directory, fileName);

      if (getDirname(filePath) !== directory || getBasename(filePath) !== fileName) {
        throw refuse();
      }

      return filePath;
    };
  },
});

export default getThemeFilePathInjectable;
