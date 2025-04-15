/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import type { CopyOptions, EnsureDirOptions, JsonReadOptions } from "fs-extra";
import fse from "fs-extra";

/**
 * NOTE: Add corresponding override of this injectable in `src/test-utils/override-fs-with-fakes.ts`
 */
const fsInjectable = getInjectable({
  id: "fs",
  instantiate: () => {
    const {
      promises: { readFile, writeFile, readdir, lstat, rm, access, stat, unlink, rename },
      ensureDir,
      ensureDirSync,
      readFileSync,
      readJson,
      writeJson,
      readJsonSync,
      writeFileSync,
      writeJsonSync,
      pathExistsSync,
      pathExists,
      copy,
      createReadStream,
    } = fse;

    return {
      readFile,
      readJson: readJson as (file: string, options?: JsonReadOptions | BufferEncoding) => Promise<any>,
      writeFile,
      writeJson,
      pathExists,
      readdir,
      readFileSync,
      readJsonSync,
      writeFileSync,
      writeJsonSync,
      pathExistsSync,
      lstat,
      rm,
      access,
      copy: copy as (src: string, dest: string, options?: CopyOptions) => Promise<void>,
      ensureDir: ensureDir as (path: string, options?: number | EnsureDirOptions) => Promise<void>,
      ensureDirSync,
      createReadStream,
      stat,
      unlink,
      rename,
    };
  },
  causesSideEffects: true,
});

export default fsInjectable;
