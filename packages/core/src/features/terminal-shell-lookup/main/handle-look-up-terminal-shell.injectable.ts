/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import accessPathInjectable from "../../../common/fs/access-path.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import defaultShellInjectable from "../../../common/vars/default-shell.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import processEnvInjectable from "../../shell-sync/main/env.injectable";
import { lookUpTerminalShellChannel } from "../common/channels";
import { lookUpTerminalShell } from "./look-up-terminal-shell";

const handleLookUpTerminalShellInjectable = getRequestChannelListenerInjectable({
  id: "handle-look-up-terminal-shell",
  channel: lookUpTerminalShellChannel,
  // Injected at each request, not when the listeners start: the environment and the file system have side effects.
  getHandler: (di) => (setting) =>
    lookUpTerminalShell(setting, {
      defaultShell: di.inject(defaultShellInjectable),
      isWindows: di.inject(isWindowsInjectable),
      // The PATH of Freelens, which already holds the one of the login shell (shell-sync)
      env: di.inject(processEnvInjectable),
      stat: di.inject(statInjectable),
      accessPath: di.inject(accessPathInjectable),
    }),
});

export default handleLookUpTerminalShellInjectable;
