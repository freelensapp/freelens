/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { StrictReactNode } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React, { useEffect, useState } from "react";
import type { CancelIdleCallback } from "./cancel-idle-callback.injectable";
import cancelIdleCallbackInjectable from "./cancel-idle-callback.injectable";
import idleCallbackTimeoutInjectable from "./idle-callback-timeout.injectable";
import type { RequestIdleCallback } from "./request-idle-callback.injectable";
import requestIdleCallbackInjectable from "./request-idle-callback.injectable";

export interface RenderDelayProps {
  placeholder?: StrictReactNode;
  children: StrictReactNode;
}

interface Dependencies {
  requestIdleCallback: RequestIdleCallback;
  cancelIdleCallback: CancelIdleCallback;
  idleCallbackTimeout: number;
}

const NonInjectedRenderDelay = (props: RenderDelayProps & Dependencies) => {
  const { cancelIdleCallback, requestIdleCallback, children, placeholder, idleCallbackTimeout } = props;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handle = requestIdleCallback(() => setIsVisible(true), { timeout: idleCallbackTimeout });

    return () => cancelIdleCallback(handle);
  }, []);

  return <>{isVisible ? children : placeholder}</>;
};

export const RenderDelay = withInjectables<Dependencies, RenderDelayProps>(NonInjectedRenderDelay, {
  getProps: (di, props) => ({
    ...props,
    cancelIdleCallback: di.inject(cancelIdleCallbackInjectable),
    requestIdleCallback: di.inject(requestIdleCallbackInjectable),
    idleCallbackTimeout: di.inject(idleCallbackTimeoutInjectable),
  }),
});
