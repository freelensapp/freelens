/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observer } from "mobx-react";
import React from "react";
import { withInjectables } from "@ogre-tools/injectable-react";
import { CustomThemeEditor } from "./custom-theme";

const customThemePreferenceBlockInjectable = getInjectable({
  id: "custom-theme-preference-block",
  instantiate: () => {
    const Component = observer(() => <CustomThemeEditor />);

    return {
      displayName: "Custom Theme",
      Component: withInjectables(Component, {
        getProps: () => ({}),
      }),
    };
  },
});

export default customThemePreferenceBlockInjectable;