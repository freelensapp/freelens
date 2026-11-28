/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject } from "@freelensapp/utilities";
import * as verkit from "verkit";

import type {
  MarketplaceExtension,
  MarketplaceExtensionAuthor,
  MarketplaceExtensionTier,
  MarketplaceExtensionVersion,
} from "./marketplace-extensions.injectable";

const apiVersion = "freelens.app/v1";
const listKind = "MarketplaceExtensionList";
const entryKind = "MarketplaceExtension";

const dnsLabel = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const iconFileName = /^[A-Za-z0-9_-][A-Za-z0-9._-]*\.png$/;

export interface ParseMarketplaceExtensionListOptions {
  /**
   * The version of the running Freelens, without a prerelease, which the
   * `freelens` range of an item has to match.
   */
  freelensVersion: string;
  /**
   * Where the list was downloaded from: icons are resolved against it.
   */
  listUrl: string;
}

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const optionalString = (value: unknown): string | undefined => (isString(value) ? value : undefined);

const httpsUrl = (value: unknown): string | undefined => {
  if (!isString(value)) {
    return undefined;
  }

  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
};

const isTier = (value: unknown): value is MarketplaceExtensionTier => value === "official" || value === "community";

const toAuthor = (value: unknown): MarketplaceExtensionAuthor | undefined => {
  if (!isObject(value) || !isString(value.name)) {
    return undefined;
  }

  return {
    name: value.name,
    email: optionalString(value.email),
    url: httpsUrl(value.url),
  };
};

/**
 * An item that cannot be installed as the list describes it yields
 * `undefined`: one with `url` needs `integrity`, as the schema of the list
 * requires, since a tarball without it would be installed unverified.
 */
const toVersion = (value: unknown): MarketplaceExtensionVersion | undefined => {
  if (!isObject(value) || !isString(value.version) || !isString(value.freelens)) {
    return undefined;
  }

  if (value.url === undefined && value.integrity === undefined) {
    return { version: value.version, freelens: value.freelens };
  }

  const url = httpsUrl(value.url);

  if (!url || !isString(value.integrity)) {
    return undefined;
  }

  return { version: value.version, freelens: value.freelens, url, integrity: value.integrity };
};

const resolveIcon = (name: string, icon: unknown, listUrl: string): string | undefined => {
  if (!isString(icon) || !iconFileName.test(icon) || icon.includes("..")) {
    return undefined;
  }

  try {
    return new URL(`extensions/${name}/${icon}`, listUrl).href;
  } catch {
    return undefined;
  }
};

const toMarketplaceExtension = (
  value: unknown,
  { freelensVersion, listUrl }: ParseMarketplaceExtensionListOptions,
): MarketplaceExtension | undefined => {
  if (!isObject(value) || value.apiVersion !== apiVersion || value.kind !== entryKind) {
    return undefined;
  }

  const { metadata, spec } = value;

  if (!isObject(metadata) || !isString(metadata.name) || !dnsLabel.test(metadata.name) || !isObject(spec)) {
    return undefined;
  }

  const { displayName, summary, tier, package: packageName, versions } = spec;

  if (!isString(displayName) || !isString(summary) || !isTier(tier) || !isString(packageName)) {
    return undefined;
  }

  // The list keeps the items newest first, so the first that matches is the newest.
  const version = (Array.isArray(versions) ? versions : [])
    .map(toVersion)
    .find((item) => item && verkit.satisfies(freelensVersion, item.freelens));

  if (!version) {
    return undefined;
  }

  const authors = (Array.isArray(spec.authors) ? spec.authors : [])
    .map(toAuthor)
    .filter((author): author is MarketplaceExtensionAuthor => author !== undefined);

  return {
    id: metadata.name,
    packageName,
    displayName,
    summary,
    description: optionalString(spec.description),
    tier,
    version,
    homepage: httpsUrl(spec.homepage),
    repository: httpsUrl(spec.repository),
    license: optionalString(spec.license),
    iconUrl: resolveIcon(metadata.name, spec.icon, listUrl),
    authors,
  };
};

/**
 * The entries of a `MarketplaceExtensionList` that the running Freelens can
 * install, in the order of the list. An entry that is malformed, or has no
 * item for this Freelens, is left out.
 */
export const parseMarketplaceExtensionList = (
  response: unknown,
  options: ParseMarketplaceExtensionListOptions,
): MarketplaceExtension[] => {
  if (!isObject(response) || response.apiVersion !== apiVersion || response.kind !== listKind) {
    throw new Error(`not a ${listKind} of ${apiVersion}`);
  }

  if (!Array.isArray(response.items)) {
    throw new Error(`a ${listKind} without items`);
  }

  return response.items
    .map((item) => toMarketplaceExtension(item, options))
    .filter((extension): extension is MarketplaceExtension => extension !== undefined);
};
