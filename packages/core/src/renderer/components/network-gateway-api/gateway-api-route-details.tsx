/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { LinkToNamespace, LinkToObject } from "../kube-object-link";
import { Table, TableCell, TableHead, TableRow } from "../table";
import { WithTooltip } from "../with-tooltip";
import { getGatewayApiVersion } from "./gateway-api-version";

import type { KubeObject } from "@freelensapp/kube-object";

export interface GatewayApiParentRefRow {
  kind: string;
  name: string;
  namespace?: string;
  sectionName?: string;
}

export interface GatewayApiBackendRefRow {
  kind?: string;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

interface ParentRefsTableProps {
  object: KubeObject;
  parentRefs: GatewayApiParentRefRow[];
  apiVersion: string;
}

interface BackendRefsTableProps {
  object: KubeObject;
  backendRefs: GatewayApiBackendRefRow[];
}

interface RuleSectionProps {
  className: string;
  label: string;
  children: React.ReactNode;
}

const getRouteNamespace = (object: KubeObject, namespace?: string) => {
  const trimmedNamespace = namespace?.trim();

  if (trimmedNamespace) {
    return trimmedNamespace;
  }

  return typeof object.getNs === "function" ? object.getNs() : undefined;
};

export const GatewayApiParentRefsTable = ({ object, parentRefs, apiVersion }: ParentRefsTableProps) => {
  if (parentRefs.length === 0) {
    return <p>No parent references</p>;
  }

  return (
    <Table className="parent-refs">
      <TableHead flat>
        <TableCell className="kind">Kind</TableCell>
        <TableCell className="name">Name</TableCell>
        <TableCell className="namespace">Namespace</TableCell>
        <TableCell className="section">Section</TableCell>
      </TableHead>
      {parentRefs.map((ref, index) => {
        const namespace = getRouteNamespace(object, ref.namespace);

        return (
          <TableRow key={index}>
            <TableCell className="kind">{ref.kind}</TableCell>
            <TableCell className="name">
              <LinkToObject
                object={object}
                objectRef={{
                  kind: ref.kind,
                  name: ref.name,
                  namespace,
                  apiVersion,
                }}
              />
            </TableCell>
            <TableCell className="namespace">{namespace ? <LinkToNamespace namespace={namespace} /> : "-"}</TableCell>
            <TableCell className="section">{ref.sectionName ?? "-"}</TableCell>
          </TableRow>
        );
      })}
    </Table>
  );
};

export const GatewayApiBackendRefsTable = ({ object, backendRefs }: BackendRefsTableProps) => {
  if (backendRefs.length === 0) {
    return <p>No backend references</p>;
  }

  return (
    <Table className="backend-refs">
      <TableHead flat>
        <TableCell className="kind">Kind</TableCell>
        <TableCell className="name">Name</TableCell>
        <TableCell className="namespace">Namespace</TableCell>
        <TableCell className="port">Port</TableCell>
        <TableCell className="weight">Weight</TableCell>
      </TableHead>
      {backendRefs.map((ref, index) => {
        const namespace = getRouteNamespace(object, ref.namespace);
        const kind = ref.kind ?? "Service";

        return (
          <TableRow key={index}>
            <TableCell className="kind">{kind}</TableCell>
            <TableCell className="name">
              <LinkToObject
                object={object}
                objectRef={{
                  kind,
                  name: ref.name,
                  namespace,
                  apiVersion: "v1",
                }}
              />
            </TableCell>
            <TableCell className="namespace">{namespace ? <LinkToNamespace namespace={namespace} /> : "-"}</TableCell>
            <TableCell className="port">{ref.port ?? "-"}</TableCell>
            <TableCell className="weight">{ref.weight ?? 1}</TableCell>
          </TableRow>
        );
      })}
    </Table>
  );
};

export const GatewayApiRuleSection = ({ className, label, children }: RuleSectionProps) => (
  <div className={className}>
    <div className="label">{label}</div>
    <div className="value">{children}</div>
  </div>
);

export const renderBackendLinks = (object: KubeObject, backendRefs: GatewayApiBackendRefRow[]) =>
  backendRefs.map((backendRef, backendIndex) => {
    const namespace = getRouteNamespace(object, backendRef.namespace);
    const kind = backendRef.kind ?? "Service";

    return (
      <React.Fragment key={`${kind}-${backendRef.name}-${namespace ?? ""}-${backendIndex}`}>
        {backendIndex > 0 ? ", " : null}
        <LinkToObject
          object={object}
          objectRef={{
            kind,
            name: backendRef.name,
            namespace,
            apiVersion: "v1",
          }}
        />
      </React.Fragment>
    );
  });

export const renderParentRefLinks = (object: KubeObject, parentRefs: GatewayApiParentRefRow[]) => {
  if (parentRefs.length === 0) {
    return "-";
  }

  const apiVersion = getGatewayApiVersion(object);

  const resolvedRefs = parentRefs.map((ref) => ({
    ...ref,
    namespace: getRouteNamespace(object, ref.namespace),
  }));

  const tooltip = resolvedRefs
    .map((ref) => {
      const namespaceSuffix = ref.namespace ? ` (${ref.namespace})` : "";

      return `${ref.kind}/${ref.name}${namespaceSuffix}`;
    })
    .join(", ");

  return (
    <WithTooltip tooltip={tooltip}>
      {resolvedRefs.map((ref, index) => (
        <React.Fragment key={`${ref.kind}-${ref.name}-${ref.namespace ?? ""}-${index}`}>
          {index > 0 ? ", " : null}
          <LinkToObject
            object={object}
            objectRef={{
              kind: ref.kind,
              name: ref.name,
              namespace: ref.namespace,
              apiVersion,
            }}
          />
        </React.Fragment>
      ))}
    </WithTooltip>
  );
};
