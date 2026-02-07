/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./reference-grant-details.scss";

import { ReferenceGrant } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerTitle } from "../drawer";
import { LinkToNamespace, LinkToObject } from "../kube-object-link";
import { Table, TableCell, TableHead, TableRow } from "../table";

import type { ReferenceGrantFrom, ReferenceGrantTo } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface ReferenceGrantDetailsProps extends KubeObjectDetailsProps<ReferenceGrant> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedReferenceGrantDetails extends React.Component<ReferenceGrantDetailsProps & Dependencies> {
  getApiVersionForRef(kind: ReferenceGrantTo["kind"], group?: string) {
    if (!group || group === "core") {
      return "v1";
    }

    if (group === "gateway.networking.k8s.io") {
      switch (kind) {
        case "TCPRoute":
        case "TLSRoute":
        case "UDPRoute":
          return "gateway.networking.k8s.io/v1alpha2";
        default:
          return "gateway.networking.k8s.io/v1";
      }
    }

    return `${group}/v1`;
  }

  renderFromRefs(fromRefs: ReferenceGrantFrom[]) {
    if (fromRefs.length === 0) {
      return <p>No &quot;from&quot; references</p>;
    }

    return (
      <Table className="from-refs">
        <TableHead flat>
          <TableCell className="group">Group</TableCell>
          <TableCell className="kind">Kind</TableCell>
          <TableCell className="namespace">Namespace</TableCell>
        </TableHead>
        {fromRefs.map((ref, index) => (
          <TableRow key={index}>
            <TableCell className="group">{ref.group || "core"}</TableCell>
            <TableCell className="kind">{ref.kind}</TableCell>
            <TableCell className="namespace">
              {ref.namespace ? <LinkToNamespace namespace={ref.namespace} /> : "All namespaces"}
            </TableCell>
          </TableRow>
        ))}
      </Table>
    );
  }

  renderToRefs(referenceGrant: ReferenceGrant, toRefs: ReferenceGrantTo[]) {
    if (toRefs.length === 0) {
      return <p>No &quot;to&quot; references</p>;
    }

    return (
      <Table className="to-refs">
        <TableHead flat>
          <TableCell className="group">Group</TableCell>
          <TableCell className="kind">Kind</TableCell>
          <TableCell className="name">Name</TableCell>
        </TableHead>
        {toRefs.map((ref, index) => (
          <TableRow key={index}>
            <TableCell className="group">{ref.group || "core"}</TableCell>
            <TableCell className="kind">{ref.kind}</TableCell>
            <TableCell className="name">
              {ref.name ? (
                <LinkToObject
                  object={referenceGrant}
                  objectRef={{
                    kind: ref.kind,
                    name: ref.name,
                    namespace: referenceGrant.getNs(),
                    apiVersion: this.getApiVersionForRef(ref.kind, ref.group),
                  }}
                />
              ) : (
                "All resources"
              )}
            </TableCell>
          </TableRow>
        ))}
      </Table>
    );
  }

  render() {
    const { object: referenceGrant, logger } = this.props;

    if (!referenceGrant) {
      return null;
    }

    if (!(referenceGrant instanceof ReferenceGrant)) {
      logger.error("[ReferenceGrantDetails]: passed object that is not an instanceof ReferenceGrant", referenceGrant);

      return null;
    }

    const fromRefs = referenceGrant.getFrom();
    const toRefs = referenceGrant.getTo();

    return (
      <div className="ReferenceGrantDetails">
        <DrawerTitle>From (Resources Granting Permission)</DrawerTitle>
        {this.renderFromRefs(fromRefs)}

        <DrawerTitle>To (Resources That Can Be Referenced)</DrawerTitle>
        {this.renderToRefs(referenceGrant, toRefs)}
      </div>
    );
  }
}

export const ReferenceGrantDetails = withInjectables<Dependencies, ReferenceGrantDetailsProps>(
  NonInjectedReferenceGrantDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
