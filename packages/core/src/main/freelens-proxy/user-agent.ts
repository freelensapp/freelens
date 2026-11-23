/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import packageJson from "../../../package.json";

/**
 * The `User-Agent` Freelens sends to the cluster. For a write without a
 * `fieldManager`, the API server names the field manager after the part of it
 * before the first `/`, so the fields the UI sets belong to `Freelens`.
 */
export const freelensUserAgent = `Freelens/${packageJson.version}`;

/**
 * Every browser sends a `User-Agent` that starts with this, and the renderer
 * cannot set its own: `User-Agent` is a forbidden header name in Chromium.
 */
const browserUserAgentPrefix = "Mozilla/";

/**
 * The `User-Agent` to forward to the cluster for one a client sent. The
 * renderer's, which is the browser's, becomes Freelens'. kubectl, helm and
 * main reach the cluster through the same proxy, and keep their own: helm
 * sends no `fieldManager` either, and its fields must stay `Helm`'s.
 */
export function userAgentForCluster(userAgent: string): string {
  return userAgent.startsWith(browserUserAgentPrefix) ? freelensUserAgent : userAgent;
}
