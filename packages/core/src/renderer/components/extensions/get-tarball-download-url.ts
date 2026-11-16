/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { defaultExtensionRegistryUrl } from "../../../features/user-preferences/common/preferences-helpers";

const defaultRegistryHost = new URL(defaultExtensionRegistryUrl).host;

/**
 * The URL to download the archive of a package version from.
 *
 * A registry other than the default one may answer with the `dist.tarball` of
 * the default registry, as a proxy does when it passes the metadata on as it
 * got it. Following that URL would download the archive from outside the
 * configured registry. Such an archive is requested from the configured
 * registry instead, at the same path under the path of the registry: npm does
 * the same by default (`replace-registry-host`), and here the path of a
 * registry served under a prefix is kept too.
 *
 * A `dist.tarball` on any other host is left as it is: the registry chose it.
 */
export const getTarballDownloadUrl = (tarballUrl: string, baseRegistryUrl: string): string => {
  let tarball: URL;
  let registry: URL;

  try {
    tarball = new URL(tarballUrl);
    registry = new URL(baseRegistryUrl);
  } catch {
    return tarballUrl;
  }

  if (tarball.host !== defaultRegistryHost || registry.host === defaultRegistryHost) {
    return tarballUrl;
  }

  registry.pathname = registry.pathname.replace(/\/?$/, "/") + tarball.pathname.replace(/^\/+/, "");

  return registry.href;
};
