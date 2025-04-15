/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ExecFileException } from "child_process";
import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import helmBinaryPathInjectable from "../helm-binary-path.injectable";
import execHelmEnvInjectable from "./exec-env.injectable";

export type ExecHelm = (args: string[]) => AsyncResult<string, ExecFileException & { stderr: string }>;

const execHelmInjectable = getInjectable({
  id: "exec-helm",

  instantiate: (di): ExecHelm => {
    const execFile = di.inject(execFileInjectable);
    const execHelmEnv = di.inject(execHelmEnvInjectable);
    const helmBinaryPath = di.inject(helmBinaryPathInjectable);

    return async (args) =>
      execFile(helmBinaryPath, args, {
        maxBuffer: 32 * 1024 * 1024 * 1024, // 32 MiB
        env: execHelmEnv.get(),
      });
  },
});

export default execHelmInjectable;
