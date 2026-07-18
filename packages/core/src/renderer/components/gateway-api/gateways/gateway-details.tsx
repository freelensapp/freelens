/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../../drawer";
import { Table, TableCell, TableHead, TableRow } from "../../table";

import type { Gateway } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../../kube-object-details";

export interface GatewayDetailsProps extends KubeObjectDetailsProps<Gateway> {}

const NonInjectedGatewayDetails = observer((props: GatewayDetailsProps) => {
  const { object: gateway } = props;

  if (!gateway) return null;

  const listeners = gateway.getListeners();
  const addresses = gateway.getAddresses();
  const conditions = gateway.getConditions();

  return (
    <div className="GatewayDetails">
      <DrawerItem name="GatewayClass">{gateway.getGatewayClassName()}</DrawerItem>

      {addresses.length > 0 && <DrawerItem name="Addresses">{addresses.join(", ")}</DrawerItem>}

      {listeners.length > 0 && (
        <>
          <DrawerTitle>Listeners</DrawerTitle>
          <Table>
            <TableHead>
              <TableCell className="name">Name</TableCell>
              <TableCell className="port">Port</TableCell>
              <TableCell className="protocol">Protocol</TableCell>
              <TableCell className="hostname">Hostname</TableCell>
            </TableHead>
            {listeners.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="name">{l.name}</TableCell>
                <TableCell className="port">{l.port}</TableCell>
                <TableCell className="protocol">{l.protocol}</TableCell>
                <TableCell className="hostname">{l.hostname ?? "*"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}

      {conditions.length > 0 && (
        <>
          <DrawerTitle>Conditions</DrawerTitle>
          <Table>
            <TableHead>
              <TableCell className="type">Type</TableCell>
              <TableCell className="status">Status</TableCell>
              <TableCell className="reason">Reason</TableCell>
            </TableHead>
            {conditions.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="type">{c.type}</TableCell>
                <TableCell className="status">{c.status}</TableCell>
                <TableCell className="reason">{c.reason ?? "-"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}
    </div>
  );
});

export const GatewayDetails = withInjectables<{}, GatewayDetailsProps>(NonInjectedGatewayDetails, {
  getProps: (_di, props) => props,
});
