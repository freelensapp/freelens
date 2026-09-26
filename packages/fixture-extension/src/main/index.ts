/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The main entrypoint of the in-repo contract fixture: the skeleton the
// main-side contract tests build on. For now it proves the type level of the
// main environment — `Main.LensExtension`, `Main.Ipc` and a Node builtin all
// compile under `src/main/tsconfig.json`, which has `@types/node` and no DOM —
// and that the bundle builds with the builtins left external.

import os from "node:os";
import { Main } from "@freelensapp/extensions";
import { createRequestId, getProbeHost, HOST_INFO_CHANNEL } from "../common/host-info";

import type { HostInfo } from "../common/host-info";

class FixtureIpc extends Main.Ipc {}

export default class FixtureMainExtension extends Main.LensExtension {
  protected onActivate(): void {
    FixtureIpc.createInstance(this).handle(
      HOST_INFO_CHANNEL,
      (): HostInfo => ({
        platform: os.platform(),
        requestId: createRequestId(),
        probeHost: getProbeHost(),
      }),
    );
  }
}
