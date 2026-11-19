/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import readFileBufferInjectable from "../../../common/fs/read-file-buffer.injectable";
import isLogicalChildPathInjectable from "../../../common/path/is-logical-child-path.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import staticFilesDirectoryInjectable from "../../../common/vars/static-files-directory.injectable";
import { contentTypes } from "../../router/router-content-types";

import type { LensApiRequest } from "../../router/route";

const prodStaticFileRouteHandlerInjectable = getInjectable({
  id: "prod-static-file-route-handler",
  instantiate: (di) => {
    const readFileBuffer = di.inject(readFileBufferInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const isLogicalChildPath = di.inject(isLogicalChildPathInjectable);
    const staticFilesDirectory = di.inject(staticFilesDirectoryInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "FILE-ROUTE");

    return async ({ params }: LensApiRequest<"/{path*}">) => {
      const filePath =
        !params.path || params.path === "/"
          ? "/build/index.html"
          : path.posix.extname(params.path)
            ? params.path
            : "/build/index.html";

      const assetFilePath = joinPaths(staticFilesDirectory, filePath);

      // The router decodes the parameter, so `%2F` becomes a separator here, and
      // a prefix test would let `../static-other/…` through.
      if (!isLogicalChildPath(staticFilesDirectory, assetFilePath)) {
        return { statusCode: 404 };
      }

      const fileExtension = path.extname(assetFilePath).slice(1);
      const contentType = contentTypes[fileExtension] || contentTypes.txt;

      try {
        return { response: await readFileBuffer(assetFilePath), contentType };
      } catch (err) {
        logger.error(`failed to find file "${filePath}"`, err);

        return { statusCode: 404 };
      }
    };
  },
});

export default prodStaticFileRouteHandlerInjectable;
