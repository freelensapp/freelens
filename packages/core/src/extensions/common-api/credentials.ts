/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import credentialsForExtensionInjectable from "../../features/extension-credentials/common/credentials-for-extension.injectable";
import { asLazyInjectedFunctionForExtensionApi } from "../extension-api-di";

/**
 * The credentials of an extension: string values kept encrypted at rest with
 * Electron's `safeStorage`, in the main process and the renderer alike.
 *
 * Pass the extension instance, `this` in its `Main.LensExtension` or
 * `Renderer.LensExtension` class. The host derives the scope from the instance
 * it loaded, so a field initializer works:
 *
 * ```ts
 * private readonly credentials = Common.Credentials.forExtension(this);
 * ```
 *
 * Every method of the result rejects for a value that is not an extension
 * instance the host loaded, and every method but `isAvailable()` rejects when
 * the system has no secret store. The values are removed when the extension
 * is uninstalled, and kept when it is disabled.
 *
 * Encrypted at rest is the whole promise: this is not a boundary between
 * extensions, nor a protection against programs running as the same user.
 */
export const forExtension = asLazyInjectedFunctionForExtensionApi(credentialsForExtensionInjectable);
