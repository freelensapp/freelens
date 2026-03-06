/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./gateway-details.scss";

import { Gateway } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { LinkToObject } from "../kube-object-link";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { Table, TableCell, TableHead, TableRow } from "../table";
import { getGatewayApiVersion } from "./gateway-api-version";

import type { GatewayListener } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface GatewayDetailsProps extends KubeObjectDetailsProps<Gateway> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedGatewayDetails extends React.Component<GatewayDetailsProps & Dependencies> {
  renderListeners(listeners: GatewayListener[]) {
    if (listeners.length === 0) {
      return <p>No listeners defined</p>;
    }

    return (
      <Table className="listeners">
        <TableHead flat>
          <TableCell className="name">Name</TableCell>
          <TableCell className="hostname">Hostname</TableCell>
          <TableCell className="port">Port</TableCell>
          <TableCell className="protocol">Protocol</TableCell>
          <TableCell className="tls">TLS Mode</TableCell>
        </TableHead>
        {listeners.map((listener, index) => (
          <TableRow key={index}>
            <TableCell className="name">{listener.name}</TableCell>
            <TableCell className="hostname">{listener.hostname ?? "*"}</TableCell>
            <TableCell className="port">{listener.port}</TableCell>
            <TableCell className="protocol">{listener.protocol}</TableCell>
            <TableCell className="tls">{listener.tls?.mode ?? "-"}</TableCell>
          </TableRow>
        ))}
      </Table>
    );
  }

  renderListenerStatus() {
    const { object: gateway } = this.props;
    const listenerStatuses = gateway.status?.listeners;

    if (!listenerStatuses || listenerStatuses.length === 0) {
      return null;
    }

    return (
      <>
        <DrawerTitle>Listener Status</DrawerTitle>
        <Table className="listener-status">
          <TableHead flat>
            <TableCell className="name">Name</TableCell>
            <TableCell className="attached">Attached Routes</TableCell>
          </TableHead>
          {listenerStatuses.map((status, index) => (
            <TableRow key={index}>
              <TableCell className="name">{status.name}</TableCell>
              <TableCell className="attached">{status.attachedRoutes}</TableCell>
            </TableRow>
          ))}
        </Table>
      </>
    );
  }

  render() {
    const { object: gateway, logger } = this.props;

    if (!gateway) {
      return null;
    }

    if (!(gateway instanceof Gateway)) {
      logger.error("[GatewayDetails]: passed object that is not an instanceof Gateway", gateway);

      return null;
    }

    const addresses = gateway.getAddresses();
    const listeners = gateway.getListeners();
    const gatewayClassName = gateway.getClassName();

    return (
      <div className="GatewayDetails">
        <DrawerItem name="Gateway Class">
          {gatewayClassName ? (
            <LinkToObject
              object={gateway}
              objectRef={{
                kind: "GatewayClass",
                name: gatewayClassName,
                apiVersion: getGatewayApiVersion(gateway),
              }}
            />
          ) : (
            "-"
          )}
        </DrawerItem>
        <DrawerItem name="Addresses">{addresses.length > 0 ? addresses.join(", ") : "-"}</DrawerItem>
        <DrawerItem name="Ready">
          <KubeObjectStatusIcon object={gateway} />
        </DrawerItem>

        <DrawerTitle>Listeners</DrawerTitle>
        {this.renderListeners(listeners)}

        {this.renderListenerStatus()}
      </div>
    );
  }
}

export const GatewayDetails = withInjectables<Dependencies, GatewayDetailsProps>(NonInjectedGatewayDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
  }),
});
