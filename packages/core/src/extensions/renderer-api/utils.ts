/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Util as CommonUtil } from "../common-api/utils";

/**
 * `Common.Util`, and no `fetch`: HTTP from the renderer is the global `fetch`,
 * Chromium's, with the window session's settings, which is the client the host
 * itself uses there. `Main.Util.fetch` exists because the main process's
 * global does not apply the user's settings.
 */
const Util = {
  ...CommonUtil,
};

export { Util };
