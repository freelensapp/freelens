/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToPortForwardsInjectable from "../../common/front-end-routing/routes/cluster/network/port-forwards/navigate-to-port-forwards.injectable";

const aboutPortForwardingInjectable = getInjectable({
  id: "about-port-forwarding",

  instantiate: (di) => {
    const showSuccessNotification = di.inject(showSuccessNotificationInjectable);
    const navigateToPortForwards = di.inject(navigateToPortForwardsInjectable);

    return () => {
      const removeNotification = showSuccessNotification(
        <div className="flex flex-col gap-2">
          <b>Port Forwarding</b>
          <p>You can manage your port forwards on the Port Forwarding Page.</p>
          <div className="flex gap-2 grow shrink-0 basis-0">
            <Button
              active
              outlined
              label="Go to Port Forwarding"
              onClick={() => {
                navigateToPortForwards();
                removeNotification();
              }}
            />
          </div>
        </div>,
        {
          id: "port-forward-notification",
          timeout: 10_000,
        },
      );
    };
  },
});

export default aboutPortForwardingInjectable;
