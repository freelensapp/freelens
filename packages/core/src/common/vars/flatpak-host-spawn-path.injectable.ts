/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

/**
 * The `host-spawn` helper the Flatpak package installs into `/app/bin`. It runs
 * a command on the host through the Flatpak spawn portal, so that the terminal
 * of a sandboxed Freelens is the user's own shell with the user's own tools.
 *
 * `host-spawn` only forwards the environment variables named in its `-env`
 * option to the host process (by default just `TERM` and `PWD`), reading their
 * values from its own environment. Anything Freelens starts through it must
 * therefore be given both the variables in the spawn options' `env` and their
 * names in `-env`; see `main/host-spawn`.
 */
const flatpakHostSpawnPathInjectable = getInjectable({
  id: "flatpak-host-spawn-path",
  instantiate: () => "/app/bin/host-spawn",
});

export default flatpakHostSpawnPathInjectable;
