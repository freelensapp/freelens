/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { storageClassApiInjectable } from "@freelensapp/kube-api-specifics";
import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import getMaybeDetailsUrlInjectable, {
  type GetMaybeDetailsUrl,
} from "../kube-detail-params/get-maybe-details-url.injectable";
import { MaybeLink } from "../maybe-link";
import { WithTooltip } from "../with-tooltip";

import type { StorageClassApi } from "@freelensapp/kube-api";

interface Dependencies {
  getMaybeDetailsUrl: GetMaybeDetailsUrl;
  storageClassApi: StorageClassApi;
}

interface LinkToStorageClassProps {
  name?: string;
}

function NonInjectedLinkToStorageClass({
  name,
  getMaybeDetailsUrl,
  storageClassApi,
}: LinkToStorageClassProps & Dependencies) {
  if (!name) return null;

  return (
    <MaybeLink
      key="link"
      to={getMaybeDetailsUrl(
        storageClassApi.formatUrlForNotListing({
          name,
        }),
      )}
      onClick={stopPropagation}
    >
      <WithTooltip>{name}</WithTooltip>
    </MaybeLink>
  );
}

export const LinkToStorageClass = withInjectables<Dependencies, LinkToStorageClassProps>(
  NonInjectedLinkToStorageClass,
  {
    getProps: (di, props) => ({
      ...props,
      getMaybeDetailsUrl: di.inject(getMaybeDetailsUrlInjectable),
      storageClassApi: di.inject(storageClassApiInjectable),
    }),
  },
);
