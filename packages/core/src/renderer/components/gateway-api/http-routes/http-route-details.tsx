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

import type { HTTPRoute } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../../kube-object-details";

export interface HTTPRouteDetailsProps extends KubeObjectDetailsProps<HTTPRoute> {}

const NonInjectedHTTPRouteDetails = observer((props: HTTPRouteDetailsProps) => {
  const { object: route } = props;

  if (!route) return null;

  const parentRefs = route.getParentRefs();
  const hostnames = route.getHostnames();
  const rules = route.spec.rules ?? [];

  return (
    <div className="HTTPRouteDetails">
      {hostnames.length > 0 && <DrawerItem name="Hostnames">{hostnames.join(", ")}</DrawerItem>}

      {parentRefs.length > 0 && (
        <>
          <DrawerTitle>Parent References</DrawerTitle>
          <Table>
            <TableHead>
              <TableCell className="name">Name</TableCell>
              <TableCell className="namespace">Namespace</TableCell>
              <TableCell className="section">Section</TableCell>
            </TableHead>
            {parentRefs.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="name">{p.name}</TableCell>
                <TableCell className="namespace">{p.namespace ?? "-"}</TableCell>
                <TableCell className="section">{p.sectionName ?? "-"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}

      {rules.length > 0 && (
        <>
          <DrawerTitle>Rules ({rules.length})</DrawerTitle>
          {rules.map((rule, i) => (
            <div key={i} className="rule">
              <DrawerItem name={`Rule ${i + 1} Backends`}>
                {(rule.backendRefs ?? []).map((b) => `${b.name}${b.port ? `:${b.port}` : ""}`).join(", ") || "-"}
              </DrawerItem>
            </div>
          ))}
        </>
      )}
    </div>
  );
});

export const HTTPRouteDetails = withInjectables<{}, HTTPRouteDetailsProps>(NonInjectedHTTPRouteDetails, {
  getProps: (_di, props) => props,
});
