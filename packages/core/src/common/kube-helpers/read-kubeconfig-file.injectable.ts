/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import readFileBufferInjectable from "../fs/read-file-buffer.injectable";

export type ReadKubeconfigFile = (filePath: string) => Promise<string>;

/**
 * The encoding of a kubeconfig file, from its byte order mark. Windows
 * PowerShell 5.1 writes files in UTF-16 LE with one. `TextDecoder` drops the
 * byte order mark of the encoding it decodes, UTF-8 included.
 */
export const getKubeconfigEncoding = (firstBytes: Uint8Array) => {
  if (firstBytes[0] === 0xff && firstBytes[1] === 0xfe) {
    return "utf-16le";
  }

  if (firstBytes[0] === 0xfe && firstBytes[1] === 0xff) {
    return "utf-16be";
  }

  return "utf-8";
};

const readKubeconfigFileInjectable = getInjectable({
  id: "read-kubeconfig-file",
  instantiate: (di): ReadKubeconfigFile => {
    const readFileBuffer = di.inject(readFileBufferInjectable);

    return async (filePath) => {
      const contents = await readFileBuffer(filePath);

      return new TextDecoder(getKubeconfigEncoding(contents)).decode(contents);
    };
  },
});

export default readKubeconfigFileInjectable;
