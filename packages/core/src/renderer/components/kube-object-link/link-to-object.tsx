/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import getMaybeDetailsUrlInjectable, {
  type GetMaybeDetailsUrl,
} from "../kube-detail-params/get-maybe-details-url.injectable";
import { MaybeLink } from "../maybe-link";
import { WithTooltip } from "../with-tooltip";

import type { KubeObject, LocalObjectReference, ObjectReference } from "@freelensapp/kube-object";

interface Dependencies {
  getMaybeDetailsUrl: GetMaybeDetailsUrl;
}

interface LinkToObjectProps {
  objectRef?: LocalObjectReference | ObjectReference;
  object?: KubeObject;
  tooltip?: string | React.ReactNode;
  content?: string | React.ReactNode;
}

function getRefUrl(objectRef: LocalObjectReference | ObjectReference, object: KubeObject): string {
  // Implementation depends on the specific requirements
  // For LocalObjectReference, we need to infer kind and namespace from the parent object
  if ("kind" in objectRef && objectRef.kind) {
    // ObjectReference with kind
    if ("namespace" in objectRef && objectRef.namespace) {
      return `/api/v1/namespaces/${objectRef.namespace}/${objectRef.kind.toLowerCase()}s/${objectRef.name}`;
    }
    return `/api/v1/${objectRef.kind.toLowerCase()}s/${objectRef.name}`;
  }
  // LocalObjectReference - use parent object's namespace and infer type
  return `/api/v1/namespaces/${object.getNs()}/${object.kind.toLowerCase()}s/${objectRef.name}`;
}

function NonInjectedLinkToObject({
  objectRef,
  object,
  tooltip,
  content,
  getMaybeDetailsUrl,
}: LinkToObjectProps & Dependencies) {
  if (!objectRef || !object) return null;

  return (
    <MaybeLink to={getMaybeDetailsUrl(getRefUrl(objectRef, object))} onClick={stopPropagation}>
      <WithTooltip tooltip={tooltip}>{content ?? objectRef?.name}</WithTooltip>
    </MaybeLink>
  );
}

export const LinkToObject = withInjectables<Dependencies, LinkToObjectProps>(NonInjectedLinkToObject, {
  getProps: (di, props) => ({
    ...props,
    getMaybeDetailsUrl: di.inject(getMaybeDetailsUrlInjectable),
  }),
});
