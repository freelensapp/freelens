/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import readFileBufferInjectable from "../../../../common/fs/read-file-buffer.injectable";
import realPathInjectable from "../../../../common/fs/realpath.injectable";
import getBasenameOfPathInjectable from "../../../../common/path/get-basename.injectable";
import isLogicalChildPathInjectable from "../../../../common/path/is-logical-child-path.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import { sanitizeExtensionName } from "../../../../extensions/lens-extension";
import installedExtensionsStateInjectable from "../../installer/common/installed-extensions-state.injectable";
import { parseVersionDirectoryName } from "../../installer/common/version-directory";
import { isDevelopmentBuildSegment } from "../common/build-segment";
import { contentTypeForFile, parseExtensionFileUrl } from "../common/scheme";

export type ServeExtensionFile = (request: Request) => Promise<Response>;

const logModule = "[EXTENSION-SCHEME]";

const refuse = (status: number): Response => new Response(null, { status });

/**
 * Answer a request on the `freelens-extension` scheme from the extension's
 * files on disk.
 *
 * The first path segment is resolved through the installed-extension registry
 * rather than being appended to the extensions root. For a managed install the
 * two agree, but a development install is registered in place at an arbitrary
 * path outside the root, and the registry is what knows where. It holds exactly
 * one path per extension, so resolving through it also refuses a stale build
 * which is still on disk before the sweep collects it -- hygiene rather than a
 * security control, since the stale build is our own.
 *
 * The containment check is the security-relevant one, and it is not a claim of
 * isolation between extensions, which we do not make: it keeps the handler from
 * becoming an arbitrary-file-read gadget for any script in the renderer. It has
 * to happen after symlink resolution, because node-tar refuses `..` and
 * absolute paths in an archive but a symlink inside one pointing outward is a
 * different class -- and a development install is a tree we never packed at all.
 */
const serveExtensionFileInjectable = getInjectable({
  id: "serve-extension-file",

  instantiate: (di): ServeExtensionFile => {
    const installedExtensions = di.inject(installedExtensionsStateInjectable);
    const readFileBuffer = di.inject(readFileBufferInjectable);
    const realPath = di.inject(realPathInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const isLogicalChildPath = di.inject(isLogicalChildPathInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (request) => {
      const parsed = parseExtensionFileUrl(request.url);

      if (!parsed) {
        logger.debug(`${logModule}: refusing malformed request for ${request.url}`);

        return refuse(400);
      }

      const entry = Array.from(installedExtensions.values()).find(
        ({ name }) => sanitizeExtensionName(name) === parsed.sanitizedName,
      );

      if (!entry) {
        logger.debug(`${logModule}: no extension installed as ${parsed.sanitizedName}`);

        return refuse(404);
      }

      const liveSegment = getBasenameOfPath(entry.path);
      const isLiveBuild = parseVersionDirectoryName(liveSegment)
        ? // A managed build is addressed by the directory it lives in, so a URL
          // naming a superseded one resolves to nothing.
          parsed.buildSegment === liveSegment
        : // A development install has one directory and no version discipline.
          // Its token is opaque here: it exists to break the renderer's module
          // cache on reload, and there is no other build it could reach.
          isDevelopmentBuildSegment(parsed.buildSegment);

      if (!isLiveBuild) {
        logger.debug(`${logModule}: ${parsed.buildSegment} is not the live build of ${entry.name}`);

        return refuse(404);
      }

      const requestedPath = joinPaths(entry.path, ...parsed.fileSegments);

      try {
        const root = await realPath(entry.path);
        const file = await realPath(requestedPath);

        if (!isLogicalChildPath(root, file)) {
          logger.warn(`${logModule}: refusing ${requestedPath}, which resolves outside ${entry.path}`);

          return refuse(403);
        }

        const contents = await readFileBuffer(file);

        return new Response(new Uint8Array(contents), {
          headers: { "content-type": contentTypeForFile(getBasenameOfPath(file)) },
        });
      } catch (error) {
        logger.debug(`${logModule}: cannot serve ${requestedPath}: ${error}`);

        return refuse(404);
      }
    };
  },
});

export default serveExtensionFileInjectable;
