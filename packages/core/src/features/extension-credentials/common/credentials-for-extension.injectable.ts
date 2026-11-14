/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { branding } from "../../../common/branding";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import { extensionCredentialsBackendInjectionToken } from "./extension-credentials-backend-injection-token";
import { assertCredentialKey, assertCredentialValue } from "./validation";

import type { LensExtension } from "../../../extensions/lens-extension";
import type { ExtensionCredentials } from "./extension-credentials";

export type CredentialsForExtension = (extension: LensExtension) => ExtensionCredentials;

/**
 * The credentials of an extension instance, as `Common.Credentials.forExtension`
 * gives them.
 *
 * The scope is the ID the extension loader recorded when it constructed the
 * instance, never a property of the instance or a string of the caller. It is
 * looked up on every call rather than here, so that a class field initialized
 * with `forExtension(this)`, which runs while the loader is still constructing
 * the instance, works; a value the loader did not construct rejects every call.
 */
const credentialsForExtensionInjectable = getInjectable({
  id: "credentials-for-extension",
  instantiate: (di): CredentialsForExtension => {
    const extensionLoader = di.inject(extensionLoaderInjectable);
    const backend = di.inject(extensionCredentialsBackendInjectionToken);

    return (extension) => {
      const scope = () => {
        const extensionId = extensionLoader.getIdOfConstructedInstance(extension);

        if (extensionId === undefined) {
          throw new TypeError(
            `Credentials are only available to an extension instance that ${branding.productName} loaded`,
          );
        }

        return extensionId;
      };

      return {
        isAvailable: async () => {
          scope();

          return backend.isAvailable();
        },
        get: async (key) => {
          const extensionId = scope();

          assertCredentialKey(key);

          return backend.get(extensionId, key);
        },
        set: async (key, value) => {
          const extensionId = scope();

          assertCredentialKey(key);
          assertCredentialValue(value);

          return backend.set(extensionId, key, value);
        },
        delete: async (key) => {
          const extensionId = scope();

          assertCredentialKey(key);

          return backend.delete(extensionId, key);
        },
        keys: async () => backend.keys(scope()),
      };
    };
  },
});

export default credentialsForExtensionInjectable;
