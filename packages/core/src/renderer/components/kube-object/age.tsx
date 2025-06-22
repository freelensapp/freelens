/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import moment from "moment-timezone";
import React from "react";
import { ReactiveDuration } from "../duration/reactive-duration";
import { WithTooltip } from "../with-tooltip";

export interface KubeObjectAgeProps {
  object: {
    metadata: {
      creationTimestamp?: string;
    };
  };

  /**
   * Whether the display string should prefer length over precision
   * @default true
   */
  compact?: boolean;
  withTooltip?: boolean;
}

export const KubeObjectAge = ({ object, compact = true, withTooltip = true }: KubeObjectAgeProps) =>
  withTooltip ? (
    <WithTooltip tooltip={moment(object.metadata.creationTimestamp).toDate()}>
      <ReactiveDuration timestamp={object.metadata.creationTimestamp} compact={compact} />
    </WithTooltip>
  ) : (
    <ReactiveDuration timestamp={object.metadata.creationTimestamp} compact={compact} />
  );
