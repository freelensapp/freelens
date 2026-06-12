/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { configMapApiInjectable } from "@freelensapp/kube-api-specifics";
import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import getMaybeDetailsUrlInjectable, {
  type GetMaybeDetailsUrl,
} from "../kube-detail-params/get-maybe-details-url.injectable";
import { MaybeLink } from "../maybe-link";
import { WithTooltip } from "../with-tooltip";

import type { ConfigMapApi } from "@freelensapp/kube-api";

interface Dependencies {
  getMaybeDetailsUrl: GetMaybeDetailsUrl;
  configMapApi: ConfigMapApi;
}

interface LinkToConfigMapProps {
  name?: string;
  namespace?: string;
}

function NonInjectedLinkToConfigMap({
  name,
  namespace,
  getMaybeDetailsUrl,
  configMapApi,
}: LinkToConfigMapProps & Dependencies) {
  if (!name || !namespace) return null;

  return (
    <MaybeLink
      key="link"
      to={getMaybeDetailsUrl(
        configMapApi.formatUrlForNotListing({
          name,
          namespace,
        }),
      )}
      onClick={stopPropagation}
    >
      <WithTooltip>{name}</WithTooltip>
    </MaybeLink>
  );
}

export const LinkToConfigMap = withInjectables<Dependencies, LinkToConfigMapProps>(NonInjectedLinkToConfigMap, {
  getProps: (di, props) => ({
    ...props,
    getMaybeDetailsUrl: di.inject(getMaybeDetailsUrlInjectable),
    configMapApi: di.inject(configMapApiInjectable),
  }),
});
