/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useState } from "react";

import type { Renderer } from "@freelensapp/extensions";

/** Exercises the published dock props and the host's React from a built extension. */
export const FixtureDockTab = ({ tabId, params, close }: Renderer.ExtensionDockTabProps) => {
  const [clicks, setClicks] = useState(0);

  return (
    <div data-testid={`fixture-dock-content-${tabId}`}>
      <span>{String(params.resource)}</span>
      <button type="button" onClick={() => setClicks((previous) => previous + 1)}>
        Dock count {clicks}
      </button>
      <button type="button" onClick={close}>
        Close fixture dock tab
      </button>
    </div>
  );
};
