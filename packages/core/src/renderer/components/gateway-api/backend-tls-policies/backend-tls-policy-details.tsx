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

import type { BackendTLSPolicy } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../../kube-object-details";

export interface BackendTLSPolicyDetailsProps extends KubeObjectDetailsProps<BackendTLSPolicy> {}

const NonInjectedBackendTLSPolicyDetails = observer((props: BackendTLSPolicyDetailsProps) => {
  const { object: policy } = props;

  if (!policy) return null;

  const targetRefs = policy.getTargetRefs();
  const validation = policy.spec.validation;
  const caCertRefs = validation.caCertificateRefs ?? [];

  return (
    <div className="BackendTLSPolicyDetails">
      {targetRefs.length > 0 && (
        <>
          <DrawerTitle>Target References</DrawerTitle>
          <Table>
            <TableHead>
              <TableCell className="group">Group</TableCell>
              <TableCell className="kind">Kind</TableCell>
              <TableCell className="name">Name</TableCell>
              <TableCell className="section">Section</TableCell>
            </TableHead>
            {targetRefs.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="group">{t.group || "-"}</TableCell>
                <TableCell className="kind">{t.kind || "-"}</TableCell>
                <TableCell className="name">{t.name}</TableCell>
                <TableCell className="section">{t.sectionName ?? "-"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}

      <DrawerTitle>Validation</DrawerTitle>
      <DrawerItem name="Hostname">{validation.hostname || "-"}</DrawerItem>
      {validation.wellKnownCACertificates && (
        <DrawerItem name="Well-Known CA">{validation.wellKnownCACertificates}</DrawerItem>
      )}

      {caCertRefs.length > 0 && (
        <>
          <DrawerTitle>CA Certificate References</DrawerTitle>
          <Table>
            <TableHead>
              <TableCell className="group">Group</TableCell>
              <TableCell className="kind">Kind</TableCell>
              <TableCell className="name">Name</TableCell>
            </TableHead>
            {caCertRefs.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="group">{c.group || "-"}</TableCell>
                <TableCell className="kind">{c.kind || "-"}</TableCell>
                <TableCell className="name">{c.name}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}
    </div>
  );
});

export const BackendTLSPolicyDetails = withInjectables<{}, BackendTLSPolicyDetailsProps>(
  NonInjectedBackendTLSPolicyDetails,
  {
    getProps: (_di, props) => props,
  },
);
