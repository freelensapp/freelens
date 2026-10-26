/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export const extensionDiscoveryStateChannel = "extension-discovery:state";
export const bundledExtensionsLoaded = "extension-loader:bundled-extensions-loaded";
export const extensionLoaderFromMainChannel = "extension-loader:main:state";

/**
 * A renderer asking main to enable or disable one extension, which main
 * answers once it has. Main is the only process which changes `isEnabled`, and
 * a renderer gets the change with the next state main broadcasts. A renderer
 * which changed its own copy instead would have to send it back, and every
 * frame would then also send back each state it received: with more than one
 * frame, stale copies of the state overtake newer ones and the processes go on
 * correcting each other without end.
 */
export const extensionLoaderSetIsEnabledChannel = "extension-loader:set-is-enabled";

/**
 * One reload of one development extension, carrying the extension's id and the
 * token that reload is known by. Both processes have to break their module map
 * for the same reload, and they do it the same way: the renderer with a URL
 * segment on the scheme, main with a query on a `file:` URL.
 */
export const extensionLoaderReloadDevelopmentChannel = "extension-loader:reload-development";

/**
 * The extensions which failed to load in main, as `[id, failure]` entries: a
 * request for the current state, and a broadcast whenever it changes. Main is
 * the only writer of its failures, and a renderer keeps what it receives apart
 * from its own, so neither process's failures can overwrite the other's.
 */
export const extensionLoaderLoadFailuresFromMainChannel = "extension-loader:main:load-failures";

/**
 * A renderer asking main to answer once one extension is disabled and torn
 * down there: no instance, no load in flight and no `onDeactivate` still
 * running. Main answers out of its own loader state, which a renderer has no
 * copy of, and rejects when the teardown does not finish in time.
 */
export const extensionLoaderTornDownChannel = "extension-loader:torn-down";
