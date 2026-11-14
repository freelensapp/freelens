/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The identity of the application as users and operating systems see it.
 *
 * Internal identifiers (`@freelensapp/*` packages, `FreelensExtensionApi`,
 * `engines.freelens`, `freelens-k8s-proxy`) are compatibility boundaries and
 * are deliberately not part of this module.
 */
export const branding = Object.freeze({
  productName: "ProLens",
  appId: "app.prolens.ProLens",
  /** The URL scheme the application registers itself for with the OS. */
  protocolScheme: "prolens",
  /** URL schemes that are still accepted when passed to the application, but not registered. */
  legacyProtocolSchemes: Object.freeze(["freelens"]) as readonly string[],
  homepage: "https://github.com/chago1991/prolens",
  issuesUrl: "https://github.com/chago1991/prolens/issues",
  /** `owner/name` of the GitHub repository whose releases are ProLens releases. */
  releasesRepository: "chago1991/prolens",
  userAgentProduct: "ProLens",
  certificateAuthorityName: "ProLens Certificate Authority",
  organizationName: "ProLens",
  upstream: Object.freeze({
    name: "Freelens",
    url: "https://github.com/freelensapp/freelens",
  }),
});

/**
 * Every URL scheme the protocol router accepts, the registered one first.
 */
export const acceptedProtocolSchemes: readonly string[] = Object.freeze([
  branding.protocolScheme,
  ...branding.legacyProtocolSchemes,
]);

/**
 * Whether `protocol` (as in `URL.protocol`, with or without the trailing `:`)
 * is one of the schemes the application handles.
 */
export const isAcceptedProtocol = (protocol: string): boolean =>
  acceptedProtocolSchemes.includes(protocol.toLowerCase().replace(/:$/, ""));

/**
 * Whether `value` is a deep link URL for the application, such as a command
 * line argument `prolens://app/preferences` (or the legacy `freelens://...`).
 */
export const isDeepLinkUrl = (value: string): boolean => {
  const lowerCased = value.toLowerCase();

  return acceptedProtocolSchemes.some((scheme) => lowerCased.startsWith(`${scheme}://`));
};
