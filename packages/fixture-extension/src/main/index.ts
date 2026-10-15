/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The main entrypoint of the in-repo contract fixture: the skeleton the
// main-side contract tests build on. It proves the type level of the main
// environment — `Main.LensExtension`, `Main.Ipc` and a Node builtin all
// compile under `src/main/tsconfig.json`, which has `@types/node` and no DOM —
// and that the bundle builds with the builtins left external. `runHostKubectl`
// runs the host's kubectl through `Main.Shell`, and `probeHostFetch` sends a
// request through a library given `Main.Util.fetch`; both are exported for the
// unit test that loads this bundle. `endOfLine` comes from a bundled CommonJS
// module that `require()`s a builtin, and is exported for the unit test that
// evaluates this bundle in plain Node.

import os from "node:os";
import { Main } from "@freelensapp/extensions";
import { createRequestId, getProbeHost, HOST_INFO_CHANNEL, HOST_KUBECTL_CHANNEL } from "../common/host-info";
import { endOfLine } from "./bundled-commonjs.cjs";
import { probeHostFetch } from "./host-fetch";
import { runHostKubectl } from "./host-kubectl";

import type { HostInfo } from "../common/host-info";

export { endOfLine, probeHostFetch, runHostKubectl };

class FixtureIpc extends Main.Ipc {}

export default class FixtureMainExtension extends Main.LensExtension {
  protected onActivate(): void {
    const ipc = FixtureIpc.createInstance(this);

    ipc.handle(
      HOST_INFO_CHANNEL,
      (): HostInfo => ({
        platform: os.platform(),
        requestId: createRequestId(),
        probeHost: getProbeHost(),
      }),
    );
    ipc.handle(HOST_KUBECTL_CHANNEL, (_event, clusterId?: string) => runHostKubectl(clusterId));
  }
}
