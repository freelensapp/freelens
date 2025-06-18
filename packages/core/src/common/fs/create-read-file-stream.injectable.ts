/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import fsInjectable from "./fs.injectable";
import type { ReadStream } from "fs";

export interface CreateReadStreamOptions {
  mode?: number;
  end?: number | undefined;
  flags?: string | undefined;
  encoding?: BufferEncoding | undefined;
  autoClose?: boolean | undefined;
  /**
   * @default false
   */
  emitClose?: boolean | undefined;
  start?: number | undefined;
  highWaterMark?: number | undefined;
}

export type CreateReadFileStream = (filePath: string, options?: CreateReadStreamOptions) => ReadStream;

const createReadFileStreamInjectable = getInjectable({
  id: "create-read-file-stream",
  instantiate: (di): CreateReadFileStream => di.inject(fsInjectable).createReadStream,
});

export default createReadFileStreamInjectable;
