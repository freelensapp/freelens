/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { namespaceApiInjectable } from "@freelensapp/kube-api-specifics";
import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import getMaybeDetailsUrlInjectable, {
  type GetMaybeDetailsUrl,
} from "../kube-detail-params/get-maybe-details-url.injectable";
import { MaybeLink } from "../maybe-link";
import { WithTooltip } from "../with-tooltip";

import type { NamespaceApi } from "@freelensapp/kube-api";

interface Dependencies {
  getMaybeDetailsUrl: GetMaybeDetailsUrl;
  namespaceApi: NamespaceApi;
}

interface LinkToNamespaceProps {
  namespace?: string;
}

function NonInjectedLinkToNamespace({
  namespace,
  getMaybeDetailsUrl,
  namespaceApi,
}: LinkToNamespaceProps & Dependencies) {
  if (!namespace) return null;

  return (
    <MaybeLink
      key="link"
      to={getMaybeDetailsUrl(
        namespaceApi.formatUrlForNotListing({
          name: namespace,
        }),
      )}
      onClick={stopPropagation}
    >
      <WithTooltip>{namespace}</WithTooltip>
    </MaybeLink>
  );
}

export const LinkToNamespace = withInjectables<Dependencies, LinkToNamespaceProps>(NonInjectedLinkToNamespace, {
  getProps: (di, props) => ({
    ...props,
    getMaybeDetailsUrl: di.inject(getMaybeDetailsUrlInjectable),
    namespaceApi: di.inject(namespaceApiInjectable),
  }),
});
