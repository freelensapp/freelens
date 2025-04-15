/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./lease-details.scss";

import type { Lease } from "@freelensapp/kube-object";
import { observer } from "mobx-react";
import React from "react";
import { DrawerItem } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface LeaseDetailsProps extends KubeObjectDetailsProps<Lease> {}

@observer
export class LeaseDetails extends React.Component<LeaseDetailsProps> {
  render() {
    const { object: lease } = this.props;

    return (
      <div className="LeaseDetails">
        <DrawerItem name="Holder Identity">{lease.getHolderIdentity()}</DrawerItem>

        <DrawerItem name="Lease Duration Seconds">{lease.getLeaseDurationSeconds()}</DrawerItem>

        <DrawerItem name="Lease Transitions" hidden={lease.getLeaseTransitions() === undefined}>
          {lease.getLeaseTransitions()}
        </DrawerItem>

        <DrawerItem name="Acquire Time" hidden={lease.getAcquireTime() === ""}>
          {lease.getAcquireTime()}
        </DrawerItem>

        <DrawerItem name="Renew Time">{lease.getRenewTime()}</DrawerItem>
      </div>
    );
  }
}
