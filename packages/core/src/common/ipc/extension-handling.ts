/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export const extensionDiscoveryStateChannel = "extension-discovery:state";
export const bundledExtensionsLoaded = "extension-loader:bundled-extensions-loaded";
export const extensionLoaderFromMainChannel = "extension-loader:main:state";
export const extensionLoaderFromRendererChannel = "extension-loader:renderer:state";

/**
 * One reload of one development extension, carrying the extension's id and the
 * token that reload is known by. Both processes have to break their module map
 * for the same reload, and they do it the same way: the renderer with a URL
 * segment on the scheme, main with a query on a `file:` URL.
 */
export const extensionLoaderReloadDevelopmentChannel = "extension-loader:reload-development";
