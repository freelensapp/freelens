import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import navigateToWelcomeInjectable from "../../../../../../common/front-end-routing/routes/welcome/navigate-to-welcome.injectable";
import welcomeRouteInjectable from "../../../../../../common/front-end-routing/routes/welcome/welcome-route.injectable";
import routeIsActiveInjectable from "../../../../../routes/route-is-active.injectable";

interface Dependencies {
  disabled: IComputedValue<boolean>;
  goHome: () => void;
}

const NonInjectedNavigationToHome = observer(({ disabled, goHome }: Dependencies) => (
  <Icon data-testid="home-button" material="home" onClick={goHome} disabled={disabled.get()} />
));

export const NavigationToHome = withInjectables<Dependencies>(
  NonInjectedNavigationToHome,

  {
    getProps: (di) => ({
      disabled: di.inject(routeIsActiveInjectable, di.inject(welcomeRouteInjectable)),

      goHome: di.inject(navigateToWelcomeInjectable),
    }),
  },
);
