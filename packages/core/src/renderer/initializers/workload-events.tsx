/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { shouldShowResourceInjectionToken } from "../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { Events } from "../components/events/events";

import type { IComputedValue } from "mobx";

export interface WorkloadEventsProps {}

interface Dependencies {
  workloadEventsAreAllowed: IComputedValue<boolean>;
}

const NonInjectedWorkloadEvents = observer(({ workloadEventsAreAllowed }: Dependencies & WorkloadEventsProps) => {
  if (!workloadEventsAreAllowed.get()) {
    return null;
  }

  return <Events className="box grow" compact hideFilters />;
});

export const WorkloadEvents = withInjectables<Dependencies, WorkloadEventsProps>(NonInjectedWorkloadEvents, {
  getProps: (di, props) => ({
    workloadEventsAreAllowed: di.inject(shouldShowResourceInjectionToken, {
      apiName: "events",
      group: "",
    }),
    ...props,
  }),
});
