/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import activeThemeInjectable from "../../themes/active.injectable";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";

export interface ReadyReplicasProps {
  ready: number;
  desired: number;
}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

// Classic themes keep the bare ready count; the v2 interface (themes with `uiV2`) shows a meter and ready/desired.
const NonInjectedReadyReplicas = observer(({ ready, desired, activeTheme }: ReadyReplicasProps & Dependencies) => {
  if (!activeTheme.get().uiV2) {
    return <>{ready}</>;
  }

  const percent = desired > 0 ? Math.min(100, (ready / desired) * 100) : 0;
  const state = desired === 0 ? "idle" : ready >= desired ? "ok" : "warn";

  return (
    <span className="ReadyReplicas" data-state={state} title={`${ready} of ${desired} replicas ready`}>
      <span className="meter" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
      <span className="count">{`${ready}/${desired}`}</span>
    </span>
  );
});

export const ReadyReplicas = withInjectables<Dependencies, ReadyReplicasProps>(NonInjectedReadyReplicas, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
