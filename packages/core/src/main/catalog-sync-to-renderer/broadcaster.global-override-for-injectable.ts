/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import { debounce } from "lodash";
import catalogSyncBroadcasterInjectable from "./broadcaster.injectable";

export default getGlobalOverride(catalogSyncBroadcasterInjectable, () => debounce(() => {}));
