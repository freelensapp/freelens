/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import React from "react";

export function NoMetrics() {
  return (
    <div className="flex justify-center align-center">
      <Icon material="info" />
      &nbsp;Metrics not available at the moment
    </div>
  );
}
