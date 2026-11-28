/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as verkit from "verkit";
import { describeLoadFailures, getExtensionStatus } from "../extension-status";

import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { InstalledExtensionSource } from "../../../../features/extensions/installer/common/installed-extensions";
import type { ExtensionStatus } from "../extension-status";
import type {
  MarketplaceExtensionAuthor,
  MarketplaceExtensionTier,
} from "../marketplace-extensions/marketplace-extensions.injectable";
import type { ExtensionActionState } from "./extension-action-button/extension-action-button";
import type { ExtensionCardProps } from "./extension-card";

/**
 * How the installed build got here. A managed copy is told apart by whether its
 * checksum was verified; a development install has no checksum to verify.
 */
export type ExtensionProvenance = "development" | "verified" | "unverified";

const provenanceOf = ({ isManaged, isVerified }: InstalledExtension): ExtensionProvenance => {
  if (!isManaged) return "development";

  return isVerified ? "verified" : "unverified";
};

/**
 * As long as the `summary` of a marketplace entry may be.
 */
const summaryLength = 160;

/**
 * The summary of an extension that is not in the marketplace: the description
 * of its `package.json`, on one line and cut to the length of a summary.
 */
const summaryOf = (description: string | undefined): string => {
  const text = (description ?? "").replace(/\s+/g, " ").trim();

  if (!text) return "No description available";

  return text.length > summaryLength ? `${text.slice(0, summaryLength - 1).trimEnd()}…` : text;
};

const httpsUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The `repository` of a `package.json`, a URL or an object with one, as a page
 * to open: `git+https://host/owner/repo.git` is `https://host/owner/repo`. A
 * shorthand such as `github:owner/repo` is left out.
 */
const repositoryUrlOf = (repository: unknown): string | undefined => {
  const url =
    typeof repository === "object" && repository !== null && "url" in repository ? repository.url : repository;

  return typeof url === "string" ? httpsUrl(url.replace(/^git\+/, "").replace(/\.git$/, "")) : undefined;
};

/**
 * A version and the range of Freelens it needs.
 */
export interface ExtensionCardVersion {
  version: string;
  freelens: string;
  /** Whether it is the installed version, or the one the marketplace offers. */
  source: "installed" | "marketplace";
}

/**
 * Where the extension is installed from: the package of the registry, the URL
 * of the tarball, or the file or directory on this machine.
 */
export interface ExtensionCardSource {
  label: "Package" | "URL" | "File" | "Directory";
  value: string;
}

const describeSource = (source: InstalledExtensionSource): ExtensionCardSource => {
  switch (source.kind) {
    case "registry":
      return { label: "Package", value: `${source.name}@${source.version}` };
    case "url":
      return { label: "URL", value: source.url };
    case "file":
      return { label: "File", value: source.path };
    case "directory":
      return { label: "Directory", value: source.path };
  }
};

export interface ExtensionCardDetails {
  /**
   * What an installed extension was installed from, as recorded at the install,
   * or what the marketplace installs it from.
   */
  source: ExtensionCardSource | undefined;
  /** The description of a marketplace entry, in Markdown, when it has one. */
  markdown: string | undefined;
  /**
   * The description of an extension that is not in the marketplace, as plain
   * text, when the summary on the card does not show all of it.
   */
  text: string | undefined;
  homepage: string | undefined;
  repository: string | undefined;
  versions: ExtensionCardVersion[];
}

const fullDescriptionOf = (description: string | undefined): string | undefined => {
  const text = description?.trim();

  return text && text !== summaryOf(text) ? text : undefined;
};

const deriveCtaState = ({
  entry,
  installed,
  isInstalling,
  isUpdating,
  isUninstalling,
}: ExtensionCardProps): ExtensionActionState => {
  if (isUpdating) return "updating";

  if (entry && installed && verkit.isGreaterThan(entry.version.version, installed.manifest.version)) {
    return isInstalling ? "updating" : "update";
  }

  if (isInstalling) return "installing";
  if (isUninstalling) return "uninstalling";

  return installed ? "uninstall" : "install";
};

const deriveCtaHandler = (props: ExtensionCardProps, ctaState: ExtensionActionState): (() => void) => {
  if (ctaState === "update" || ctaState === "updating") return props.onUpdate;

  return props.installed ? props.onUninstall : props.onInstall;
};

export interface UseExtensionCardResult {
  /**
   * The name of the package.
   */
  name: string;
  /**
   * The name of the marketplace entry, shown instead of the package name.
   */
  displayName: string | undefined;
  /**
   * The installed version, or the one the marketplace offers.
   */
  version: string;
  description: string;
  /**
   * The tier of the marketplace entry; an extension that is not in the
   * marketplace has none.
   */
  tier: MarketplaceExtensionTier | undefined;
  authors: MarketplaceExtensionAuthor[];
  license: string | undefined;
  iconUrl: string | undefined;
  /**
   * Where the title links to: the homepage of the entry, or its repository.
   */
  link: string | undefined;
  status: ExtensionStatus | undefined;
  /**
   * Where and why the extension failed to load.
   */
  statusDescription: string | undefined;
  provenance: ExtensionProvenance | undefined;
  /**
   * An installed extension that does not run dims its icon and its texts.
   */
  isDimmed: boolean;
  details: ExtensionCardDetails;
  ctaState: ExtensionActionState;
  ctaHandler: () => void;
  testId: string;
}

export const useExtensionCard = (props: ExtensionCardProps): UseExtensionCardResult => {
  const { entry, installed, installedSource, loadFailures = [] } = props;
  const manifest = installed?.manifest;
  const ctaState = deriveCtaState(props);
  const status = installed ? getExtensionStatus(installed, loadFailures) : undefined;
  // The fields of the `package.json` that the manifest does not type.
  const packageJson = (manifest ?? {}) as { homepage?: unknown; repository?: unknown };
  const versions: ExtensionCardVersion[] = [
    ...(manifest
      ? [{ version: manifest.version, freelens: manifest.engines.freelens, source: "installed" as const }]
      : []),
    ...(entry && entry.version.version !== manifest?.version
      ? [{ version: entry.version.version, freelens: entry.version.freelens, source: "marketplace" as const }]
      : []),
  ];

  return {
    name: entry?.packageName ?? manifest?.name ?? "",
    displayName: entry?.displayName,
    version: manifest?.version ?? entry?.version.version ?? "",
    // An installed extension that is in the marketplace takes its texts from the entry, any
    // other from its `package.json`.
    description: entry?.summary ?? summaryOf(manifest?.description),
    tier: entry?.tier,
    authors: entry?.authors ?? [],
    license: entry?.license,
    iconUrl: entry?.iconUrl,
    link: entry?.homepage ?? entry?.repository,
    status,
    statusDescription: status === "Failed to load" ? describeLoadFailures(loadFailures) : undefined,
    provenance: installed ? provenanceOf(installed) : undefined,
    details: {
      source: installed
        ? installedSource
          ? describeSource(installedSource)
          : // A build adopted from disk without a record: what it was installed from is not known.
            { label: "Package", value: `${installed.manifest.name}@${installed.manifest.version}` }
        : entry &&
          (entry.version.url
            ? { label: "URL", value: entry.version.url }
            : { label: "Package", value: `${entry.packageName}@${entry.version.version}` }),
      // The summary is on the card already, so the details show a description only when it says
      // more: the one of the entry, or the one of the package.json that the summary cut.
      markdown: entry?.description,
      text: entry ? undefined : fullDescriptionOf(manifest?.description),
      homepage: entry ? entry.homepage : httpsUrl(packageJson.homepage),
      repository: entry ? entry.repository : repositoryUrlOf(packageJson.repository),
      versions,
    },
    isDimmed: status === "Disabled" || status === "Incompatible",
    ctaState,
    ctaHandler: deriveCtaHandler(props, ctaState),
    testId: installed ? "installed-extension-card" : "marketplace-extension-card",
  };
};
