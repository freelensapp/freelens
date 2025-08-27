/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import getMaybeDetailsUrlInjectable, {
  type GetMaybeDetailsUrl,
} from "../kube-detail-params/get-maybe-details-url.injectable";
import { MaybeLink } from "../maybe-link";
import { WithTooltip } from "../with-tooltip";

import type { KubeObject, LocalObjectReference, ObjectReference } from "@freelensapp/kube-object";

import type { ApiManager } from "../../../common/k8s-api/api-manager";

interface Dependencies {
  getMaybeDetailsUrl: GetMaybeDetailsUrl;
  apiManager: ApiManager;
}

interface LinkToObjectProps {
  objectRef?: LocalObjectReference | ObjectReference;
  object?: KubeObject;
  tooltip?: string | React.ReactNode;
  content?: string | React.ReactNode;
}

function getRefUrl(apiManager: ApiManager, ref: LocalObjectReference | ObjectReference, parentObject?: KubeObject) {
  if (!ref) return;
  return apiManager.lookupApiLink(ref, parentObject);
}

function NonInjectedLinkToObject({
  objectRef,
  object,
  tooltip,
  content,
  getMaybeDetailsUrl,
  apiManager,
}: LinkToObjectProps & Dependencies) {
  if (!objectRef || !object) return null;

  return (
    <MaybeLink to={getMaybeDetailsUrl(getRefUrl(apiManager, objectRef, object))} onClick={stopPropagation}>
      <WithTooltip tooltip={tooltip}>{content ?? objectRef?.name}</WithTooltip>
    </MaybeLink>
  );
}

export const LinkToObject = withInjectables<Dependencies, LinkToObjectProps>(NonInjectedLinkToObject, {
  getProps: (di, props) => ({
    ...props,
    getMaybeDetailsUrl: di.inject(getMaybeDetailsUrlInjectable),
    apiManager: di.inject(apiManagerInjectable),
  }),
});
