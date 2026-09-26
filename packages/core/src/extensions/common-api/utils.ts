/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as utilities from "@freelensapp/utilities";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";
import { getDiForExtensionApi } from "../extension-api-di";

/**
 * Every export of `@freelensapp/utilities` is extension API, except the
 * members below: each needs Node in the renderer, which the v2 contract does
 * not guarantee (C4, C5 in `docs/v2-extension-api.md`). A new export of the
 * package becomes API unless it is added here. The host keeps importing all
 * of them from the package.
 *
 * This is a destructure rather than an `Omit<>` so that the declaration of
 * `Util` is an object type without these names, instead of a reference to the
 * whole package that would carry them into the bundled declarations.
 */
const {
  readFileFromTar: _readFileFromTar,
  listTarEntries: _listTarEntries,
  unionPATHs: _unionPATHs,
  base64: _base64,
  isBuffer: _isBuffer,
  isErrnoException: _isErrnoException,
  isExecException: _isExecException,
  isExecFileException: _isExecFileException,
  isChildProcessError: _isChildProcessError,
  isRequestError: _isRequestError,
  ...extensionUtilities
} = utilities;

const Util = {
  ...extensionUtilities,

  getAppVersion: () => {
    const di = getDiForExtensionApi();

    return di.inject(buildVersionInitializable.stateToken);
  },
};

export { Util };
