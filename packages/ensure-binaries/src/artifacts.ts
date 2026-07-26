/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { readFile } from "node:fs/promises";
import z from "zod";

/**
 * Describes where every bundled binary is published and under what name it is
 * stored locally.
 *
 * These are pure functions on purpose: both the downloader, which needs one
 * artifact for the current platform, and the lock file generator, which needs
 * every artifact for every platform, derive their URLs from here so the rules
 * live in exactly one place.
 */

export const supportedPlatforms = ["darwin", "linux", "windows"] as const;
export const supportedArches = ["x64", "arm64"] as const;
export const toolNames = ["freelens-k8s-proxy", "kubectl", "helm"] as const;

export type SupportedPlatform = (typeof supportedPlatforms)[number];
export type SupportedArch = (typeof supportedArches)[number];
export type ToolName = (typeof toolNames)[number];

/**
 * Suffix of the published checksum file, and of the sidecar recording the
 * verified checksum of a downloaded binary. The sidecar lives next to the
 * binary but is never referenced by electron-builder (which lists each packaged
 * binary explicitly), so it does not end up in the application package.
 */
export const CHECKSUM_SUFFIX = ".sha256";

export interface Artifact {
  readonly tool: ToolName;
  readonly version: string;
  readonly platform: SupportedPlatform;
  /** Architecture as Node names it, which is also the local directory name. */
  readonly arch: SupportedArch;
  /** Name of the binary once it is in place, extracted in helm's case. */
  readonly binaryName: string;
  /** What gets downloaded: the binary itself, or the archive holding it. */
  readonly url: string;
  /** Published SHA-256 of the bytes at {@link url}. */
  readonly checksumUrl: string;
}

export type ToolVersions = Record<ToolName, string>;

function getBinaryExtension(platform: SupportedPlatform): string {
  return platform === "windows" ? ".exe" : "";
}

/** Architecture as the download URLs name it, which is not how Node does. */
function toDownloadArch(arch: SupportedArch): string {
  return arch === "x64" ? "amd64" : arch;
}

export function normalizePlatform(platform: NodeJS.Platform): SupportedPlatform {
  switch (platform) {
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      throw new Error(`platform=${platform} is unsupported`);
  }
}

/** Key identifying an artifact within a tool's entry in the lock file. */
export function artifactKey({ platform, arch }: Pick<Artifact, "platform" | "arch">): string {
  return `${platform}/${arch}`;
}

export function describeArtifact({
  tool,
  version,
  platform,
  arch,
}: {
  tool: ToolName;
  version: string;
  platform: SupportedPlatform;
  arch: SupportedArch;
}): Artifact {
  const extension = getBinaryExtension(platform);
  const downloadArch = toDownloadArch(arch);
  const common = { tool, version, platform, arch } as const;

  switch (tool) {
    case "freelens-k8s-proxy": {
      const url = `https://github.com/freelensapp/freelens-k8s-proxy/releases/download/v${version}/freelens-k8s-proxy-${platform}-${downloadArch}${extension}`;

      return {
        ...common,
        binaryName: `freelens-k8s-proxy${extension}`,
        url,
        // The release publishes the Windows checksum as
        // `freelens-k8s-proxy-windows-<arch>.sha256`, without the `.exe` the
        // binary itself carries, so the suffix has to be stripped.
        checksumUrl: `${url.replace(/\.exe$/, "")}${CHECKSUM_SUFFIX}`,
      };
    }

    case "kubectl": {
      const binaryName = `kubectl${extension}`;
      const url = `https://dl.k8s.io/release/v${version}/bin/${platform}/${downloadArch}/${binaryName}`;

      return { ...common, binaryName, url, checksumUrl: `${url}${CHECKSUM_SUFFIX}` };
    }

    case "helm": {
      // The download is a tarball, so the checksum covers the archive rather
      // than the `helm` binary that gets extracted from it.
      const url = `https://get.helm.sh/helm-v${version}-${platform}-${downloadArch}.tar.gz`;

      return {
        ...common,
        binaryName: `helm${extension}`,
        url,
        checksumUrl: `${url}${CHECKSUM_SUFFIX}`,
      };
    }
  }
}

/** Every artifact of every tool, for every platform and architecture. */
export function describeAllArtifacts(versions: ToolVersions): Artifact[] {
  return toolNames.flatMap((tool) =>
    supportedPlatforms.flatMap((platform) =>
      supportedArches.map((arch) => describeArtifact({ tool, version: versions[tool], platform, arch })),
    ),
  );
}

const PackageInfo = z.object({
  config: z.object({
    k8sProxyVersion: z.string().min(1),
    bundledKubectlVersion: z.string().min(1),
    bundledHelmVersion: z.string().min(1),
  }),
});

/** Reads the bundled versions out of the `config` block of a package.json. */
export async function readToolVersions(pathToPackage: string): Promise<ToolVersions> {
  const { config } = PackageInfo.parse(JSON.parse(await readFile(pathToPackage, "utf-8")));

  return {
    "freelens-k8s-proxy": config.k8sProxyVersion,
    kubectl: config.bundledKubectlVersion,
    helm: config.bundledHelmVersion,
  };
}
