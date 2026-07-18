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

import type { GatewayClass } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../../kube-object-details";

export interface GatewayClassDetailsProps extends KubeObjectDetailsProps<GatewayClass> {}

const NonInjectedGatewayClassDetails = observer((props: GatewayClassDetailsProps) => {
  const { object: gatewayClass } = props;

  if (!gatewayClass) return null;

  const conditions = gatewayClass.getConditions();

  return (
    <div className="GatewayClassDetails">
      <DrawerItem name="Controller">{gatewayClass.getController()}</DrawerItem>
      {gatewayClass.spec.parametersRef && (
        <>
          <DrawerTitle>Parameters</DrawerTitle>
          <DrawerItem name="Group">{gatewayClass.spec.parametersRef.group}</DrawerItem>
          <DrawerItem name="Kind">{gatewayClass.spec.parametersRef.kind}</DrawerItem>
          <DrawerItem name="Name">{gatewayClass.spec.parametersRef.name}</DrawerItem>
          {gatewayClass.spec.parametersRef.namespace && (
            <DrawerItem name="Namespace">{gatewayClass.spec.parametersRef.namespace}</DrawerItem>
          )}
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
              <TableCell className="message">Message</TableCell>
            </TableHead>
            {conditions.map((cond, i) => (
              <TableRow key={i}>
                <TableCell className="type">{cond.type}</TableCell>
                <TableCell className="status">{cond.status}</TableCell>
                <TableCell className="reason">{cond.reason ?? "-"}</TableCell>
                <TableCell className="message">{cond.message ?? "-"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}
    </div>
  );
});

export const GatewayClassDetails = withInjectables<{}, GatewayClassDetailsProps>(NonInjectedGatewayClassDetails, {
  getProps: (_di, props) => props,
});
