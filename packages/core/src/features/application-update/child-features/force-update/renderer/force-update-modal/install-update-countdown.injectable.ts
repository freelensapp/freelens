/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import countdownStateInjectable from "../../../../../../renderer/components/countdown/countdown-state.injectable";
import restartAndInstallUpdateInjectable from "../../../../renderer/restart-and-install-update.injectable";
import secondsAfterInstallStartsInjectable from "./seconds-after-install-starts.injectable";

const installUpdateCountdownInjectable = getInjectable({
  id: "install-update-countdown",

  instantiate: (di) => {
    const secondsAfterInstallStarts = di.inject(secondsAfterInstallStartsInjectable);
    const restartAndInstallUpdate = di.inject(restartAndInstallUpdateInjectable);

    return di.inject(countdownStateInjectable, {
      startFrom: secondsAfterInstallStarts,

      onZero: () => {
        restartAndInstallUpdate();
      },
    });
  },
});

export default installUpdateCountdownInjectable;
