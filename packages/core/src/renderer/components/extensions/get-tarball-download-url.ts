/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The public registries that serve the packages of registry.npmjs.org under
 * the same paths. A proxy whose upstream is any of them passes their
 * `dist.tarball` on, not only that of the default registry.
 */
const publicRegistryHosts = new Set([
  "registry.npmjs.org",
  "registry.npmjs.com",
  "registry.yarnpkg.com",
  "registry.npmmirror.com",
  "registry.npm.taobao.org",
]);

/**
 * The URL to download the archive of a package version from.
 *
 * A registry other than the public ones may answer with the `dist.tarball` of
 * a public registry, as a proxy does when it passes the metadata on as it got
 * it. Following that URL would download the archive from outside the
 * configured registry. Such an archive is requested from the configured
 * registry instead, at the same path under the path of the registry: npm does
 * the same by default (`replace-registry-host`), and here the path of a
 * registry served under a prefix is kept too. The query of both URLs is kept,
 * the registry's first, and so is the fragment of the tarball.
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

  if (!publicRegistryHosts.has(tarball.host) || publicRegistryHosts.has(registry.host)) {
    return tarballUrl;
  }

  registry.pathname = registry.pathname.replace(/\/?$/, "/") + tarball.pathname.replace(/^\/+/, "");

  for (const [key, value] of tarball.searchParams) {
    registry.searchParams.append(key, value);
  }

  registry.hash = tarball.hash;

  return registry.href;
};
