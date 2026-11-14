/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { branding } from "./branding";

// App's common configuration for any process (main, renderer, build pipeline, etc.)
export const defaultColorThemePreference = "system";
export const defaultFontSize = 12;
export const defaultTerminalFontFamily = "RobotoMono";
export const defaultEditorFontFamily = "RobotoMono";

// Apis
export const apiPrefix = "/api"; // local router apis
export const apiKubePrefix = "/api-kube"; // k8s cluster apis

// Links
export const issuesTrackerUrl = branding.issuesUrl as string;
export const supportUrl = branding.homepage as string;
// ProLens has no documentation of its own yet; the upstream wiki still applies
export const docsUrl = `${branding.upstream.url}/wiki` as string;
export const forumsUrl = `${branding.homepage}/discussions` as string;
