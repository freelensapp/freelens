/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import readFileBufferInjectable from "../../../common/fs/read-file-buffer.injectable";
import staticFilesDirectoryInjectable from "../../../common/vars/static-files-directory.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import prodStaticFileRouteHandlerInjectable from "./production.injectable";

import type { Mock } from "vitest";

import type { LensApiRequest } from "../../router/route";

describe("the production handler of the renderer's files", () => {
  let handle: (path: string) => Promise<unknown>;
  let readFileBuffer: Mock<(filePath: string) => Promise<NonSharedBuffer>>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    readFileBuffer = vi.fn(async () => Buffer.from("some-contents"));
    di.override(staticFilesDirectoryInjectable, () => "/some-app/static");
    di.override(readFileBufferInjectable, () => readFileBuffer);

    const handler = di.inject(prodStaticFileRouteHandlerInjectable);

    handle = (path) => handler({ params: { path } } as unknown as LensApiRequest<"/{path*}">);
  });

  it.each([
    ["build/main.js", "/some-app/static/build/main.js"],
    ["build/some-page", "/some-app/static/build/index.html"],
    ["", "/some-app/static/build/index.html"],
  ])("serves %j from %s", async (path, file) => {
    expect(await handle(path)).toMatchObject({ response: Buffer.from("some-contents") });
    expect(readFileBuffer).toHaveBeenCalledWith(file);
  });

  // The router has decoded `%2F` in these into a separator.
  it.each(["../package.json", "../static-other/some-file.js", "build/../../package.json", "../../etc/hosts.txt"])(
    "answers 404 for %j, outside the directory",
    async (path) => {
      expect(await handle(path)).toEqual({ statusCode: 404 });
      expect(readFileBuffer).not.toHaveBeenCalled();
    },
  );
});
