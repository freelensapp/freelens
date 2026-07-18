/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerTitle } from "../../drawer";
import { Table, TableCell, TableHead, TableRow } from "../../table";

import type { ReferenceGrant } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../../kube-object-details";

export interface ReferenceGrantDetailsProps extends KubeObjectDetailsProps<ReferenceGrant> {}

const NonInjectedReferenceGrantDetails = observer((props: ReferenceGrantDetailsProps) => {
  const { object: grant } = props;

  if (!grant) return null;

  const fromEntries = grant.getFrom();
  const toEntries = grant.getTo();

  return (
    <div className="ReferenceGrantDetails">
      {fromEntries.length > 0 && (
        <>
          <DrawerTitle>From</DrawerTitle>
          <Table>
            <TableHead>
              <TableCell className="group">Group</TableCell>
              <TableCell className="kind">Kind</TableCell>
              <TableCell className="namespace">Namespace</TableCell>
            </TableHead>
            {fromEntries.map((f, i) => (
              <TableRow key={i}>
                <TableCell className="group">{f.group || "-"}</TableCell>
                <TableCell className="kind">{f.kind}</TableCell>
                <TableCell className="namespace">{f.namespace}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}

      {toEntries.length > 0 && (
        <>
          <DrawerTitle>To</DrawerTitle>
          <Table>
            <TableHead>
              <TableCell className="group">Group</TableCell>
              <TableCell className="kind">Kind</TableCell>
              <TableCell className="name">Name</TableCell>
            </TableHead>
            {toEntries.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="group">{t.group ?? "-"}</TableCell>
                <TableCell className="kind">{t.kind}</TableCell>
                <TableCell className="name">{t.name ?? "-"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}
    </div>
  );
});

export const ReferenceGrantDetails = withInjectables<{}, ReferenceGrantDetailsProps>(NonInjectedReferenceGrantDetails, {
  getProps: (_di, props) => props,
});
