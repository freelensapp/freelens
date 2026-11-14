/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import navigateToPreferencesInjectable from "../../preferences/common/navigate-to-preferences.injectable";

const navigateToAiToolsPreferencesInjectable = getInjectable({
  id: "navigate-to-ai-tools-preferences",
  instantiate: (di) => {
    const navigateToPreferences = di.inject(navigateToPreferencesInjectable);

    return () => navigateToPreferences("external-tools");
  },
});

export default navigateToAiToolsPreferencesInjectable;
