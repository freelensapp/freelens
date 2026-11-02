/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import getDirnameOfPathInjectable from "../path/get-dirname.injectable";
import fsInjectable from "./fs.injectable";

export type WriteJson = (filePath: string, contents: unknown) => Promise<void>;

const writeJsonFileInjectable = getInjectable({
  id: "write-json-file",

  instantiate: (di): WriteJson => {
    const { writeJson, ensureDir, chmod } = di.inject(fsInjectable);
    const getDirnameOfPath = di.inject(getDirnameOfPathInjectable);

    // The file holds the user's data, so only the user may read it
    return async (filePath, content) => {
      await ensureDir(getDirnameOfPath(filePath), { mode: 0o700 });

      await writeJson(filePath, content, {
        encoding: "utf-8",
        spaces: 2,
        mode: 0o600,
      });

      // `mode` applies only to a file that is created, not to one written over
      await chmod(filePath, 0o600);
    };
  },
});

export default writeJsonFileInjectable;
