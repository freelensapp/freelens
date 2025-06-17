/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import goBackInjectable from "./go-back/go-back.injectable";
import topBarPrevEnabledInjectable from "./prev-enabled.injectable";

import type { IComputedValue } from "mobx";

interface Dependencies {
  prevEnabled: IComputedValue<boolean>;
  goBack: () => void;
}

const NonInjectedNavigationToBack = observer(({ prevEnabled, goBack }: Dependencies) => (
  <Icon data-testid="history-back" material="arrow_back" onClick={goBack} disabled={!prevEnabled.get()} />
));

export const NavigationToBack = withInjectables<Dependencies>(
  NonInjectedNavigationToBack,

  {
    getProps: (di) => ({
      prevEnabled: di.inject(topBarPrevEnabledInjectable),
      goBack: di.inject(goBackInjectable),
    }),
  },
);
