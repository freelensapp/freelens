/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

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
    <WithTooltip tooltip={new Date(object.metadata.creationTimestamp ?? Date.now())}>
      <ReactiveDuration timestamp={object.metadata.creationTimestamp} compact={compact} />
    </WithTooltip>
  ) : (
    <ReactiveDuration timestamp={object.metadata.creationTimestamp} compact={compact} />
  );
