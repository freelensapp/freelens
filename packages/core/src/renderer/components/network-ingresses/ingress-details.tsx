/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./ingress-details.scss";

import type { ILoadBalancerIngress } from "@freelensapp/kube-object";
import { Ingress, computeRuleDeclarations } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { Table, TableCell, TableHead, TableRow } from "../table";

export interface IngressDetailsProps extends KubeObjectDetailsProps<Ingress> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedIngressDetails extends React.Component<IngressDetailsProps & Dependencies> {
  renderPaths(ingress: Ingress) {
    return ingress.getRules().map((rule, index) => (
      <div className="rules" key={index}>
        {rule.host && <div className="host-title">{`Host: ${rule.host}`}</div>}
        {rule.http && (
          <Table className="paths">
            <TableHead flat>
              <TableCell className="path">Path</TableCell>
              <TableCell className="link">Link</TableCell>
              <TableCell className="backends">Backends</TableCell>
            </TableHead>
            {computeRuleDeclarations(ingress, rule).map(({ displayAsLink, service, url, pathname }) => (
              <TableRow key={index}>
                <TableCell className="path">{pathname}</TableCell>
                <TableCell className="link">
                  {displayAsLink ? (
                    <a href={url} rel="noreferrer" target="_blank">
                      {url}
                    </a>
                  ) : (
                    url
                  )}
                </TableCell>
                <TableCell className="backends">{service}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </div>
    ));
  }

  renderIngressPoints(ingressPoints: ILoadBalancerIngress[]) {
    if (!ingressPoints || ingressPoints.length === 0) return null;

    return (
      <div>
        <Table className="ingress-points">
          <TableHead>
            <TableCell className="name">Hostname</TableCell>
            <TableCell className="ingresspoints">IP</TableCell>
          </TableHead>
          {ingressPoints.map(({ hostname, ip }, index) => (
            <TableRow key={index}>
              <TableCell className="name">{hostname ? hostname : "-"}</TableCell>
              <TableCell className="ingresspoints">{ip ? ip : "-"}</TableCell>
            </TableRow>
          ))}
        </Table>
      </div>
    );
  }

  render() {
    const { object: ingress, logger } = this.props;

    if (!ingress) {
      return null;
    }

    if (!(ingress instanceof Ingress)) {
      logger.error("[IngressDetails]: passed object that is not an instanceof Ingress", ingress);

      return null;
    }

    const port = ingress.getServiceNamePort();

    return (
      <div className="IngressDetails">
        <DrawerItem name="Ports">{ingress.getPorts()}</DrawerItem>
        {ingress.spec.tls && (
          <DrawerItem name="TLS">
            {ingress.spec.tls.map((tls, index) => (
              <p key={index}>{tls.secretName}</p>
            ))}
          </DrawerItem>
        )}
        {port && <DrawerItem name="Service">{`${port.serviceName}:${port.servicePort}`}</DrawerItem>}
        <DrawerTitle>Rules</DrawerTitle>
        {this.renderPaths(ingress)}

        <DrawerTitle>Load-Balancer Ingress Points</DrawerTitle>
        {this.renderIngressPoints(ingress.status?.loadBalancer?.ingress ?? [])}
      </div>
    );
  }
}

export const IngressDetails = withInjectables<Dependencies, IngressDetailsProps>(NonInjectedIngressDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
  }),
});
