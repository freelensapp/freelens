/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// App's common configuration for any process (main, renderer, build pipeline, etc.)
import type { ThemeId } from "../renderer/themes/lens-theme";

export const defaultThemeId: ThemeId = "lens-dark";
export const defaultFontSize = 12;
export const defaultTerminalFontFamily = "RobotoMono";
export const defaultEditorFontFamily = "RobotoMono";

// Apis
export const apiPrefix = "/api"; // local router apis
export const apiKubePrefix = "/api-kube"; // k8s cluster apis

// Links
export const issuesTrackerUrl = "https://github.com/freelensapp/freelens/issues" as string;
export const supportUrl = "https://github.com/freelensapp/freelens" as string;
export const docsUrl = "https://github.com/freelensapp/freelens/wiki" as string;
export const forumsUrl = "https://github.com/freelensapp/freelens/discussions" as string;
