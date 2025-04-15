/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import navigateToPortForwardsInjectable from "../../common/front-end-routing/routes/cluster/network/port-forwards/navigate-to-port-forwards.injectable";

const notifyErrorPortForwardingInjectable = getInjectable({
  id: "notify-error-port-forwarding",

  instantiate: (di) => {
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const navigateToPortForwards = di.inject(navigateToPortForwardsInjectable);

    return (msg: string) => {
      const removeNotification = showErrorNotification(
        <div className="flex column gaps">
          <b>Port Forwarding</b>
          <p>{msg}</p>
          <div className="flex gaps row align-left box grow">
            <Button
              active
              outlined
              label="Check Port Forwarding"
              onClick={() => {
                navigateToPortForwards();
                removeNotification();
              }}
            />
          </div>
        </div>,
        {
          timeout: 10_000,
        },
      );
    };
  },
});

export default notifyErrorPortForwardingInjectable;
