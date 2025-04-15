/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./volume-claim-details.scss";

import type { StorageClassApi } from "@freelensapp/kube-api";
import { storageClassApiInjectable } from "@freelensapp/kube-api-specifics";
import { PersistentVolumeClaim } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { Fragment } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { PodStore } from "../workloads-pods/store";
import podStoreInjectable from "../workloads-pods/store.injectable";

export interface PersistentVolumeClaimDetailsProps extends KubeObjectDetailsProps<PersistentVolumeClaim> {}

interface Dependencies {
  getDetailsUrl: GetDetailsUrl;
  podStore: PodStore;
  storageClassApi: StorageClassApi;
  logger: Logger;
}

@observer
class NonInjectedPersistentVolumeClaimDetails extends React.Component<
  PersistentVolumeClaimDetailsProps & Dependencies
> {
  render() {
    const { object: volumeClaim, podStore, getDetailsUrl, storageClassApi, logger } = this.props;

    if (!volumeClaim) {
      return null;
    }

    if (!(volumeClaim instanceof PersistentVolumeClaim)) {
      logger.error(
        "[PersistentVolumeClaimDetails]: passed object that is not an instanceof PersistentVolumeClaim",
        volumeClaim,
      );

      return null;
    }

    const { storageClassName, accessModes } = volumeClaim.spec;
    const pods = volumeClaim.getPods(podStore.items);

    const storageClassDetailsUrl = getDetailsUrl(
      storageClassApi.formatUrlForNotListing({
        name: storageClassName,
      }),
    );

    return (
      <div className="PersistentVolumeClaimDetails">
        <DrawerItem name="Access Modes">{accessModes?.join(", ")}</DrawerItem>
        <DrawerItem name="Storage Class Name">
          <Link key="link" to={storageClassDetailsUrl} onClick={stopPropagation}>
            {storageClassName}
          </Link>
        </DrawerItem>
        <DrawerItem name="Storage">{volumeClaim.getStorage()}</DrawerItem>
        <DrawerItem name="Pods" className="pods">
          {pods.map((pod) => (
            <Link key={pod.getId()} to={getDetailsUrl(pod.selfLink)}>
              {pod.getName()}
            </Link>
          ))}
        </DrawerItem>
        <DrawerItem name="Status">{volumeClaim.getStatus()}</DrawerItem>

        <DrawerTitle>Selector</DrawerTitle>

        <DrawerItem name="Match Labels" labelsOnly>
          {volumeClaim.getMatchLabels().map((label) => (
            <Badge key={label} label={label} />
          ))}
        </DrawerItem>

        <DrawerItem name="Match Expressions">
          {volumeClaim.getMatchExpressions().map(({ key, operator, values }, i) => (
            <Fragment key={i}>
              <DrawerItem name="Key">{key}</DrawerItem>
              <DrawerItem name="Operator">{operator}</DrawerItem>
              <DrawerItem name="Values">{values?.join(", ")}</DrawerItem>
            </Fragment>
          ))}
        </DrawerItem>
      </div>
    );
  }
}

export const PersistentVolumeClaimDetails = withInjectables<Dependencies, PersistentVolumeClaimDetailsProps>(
  NonInjectedPersistentVolumeClaimDetails,
  {
    getProps: (di, props) => ({
      ...props,
      getDetailsUrl: di.inject(getDetailsUrlInjectable),
      podStore: di.inject(podStoreInjectable),
      storageClassApi: di.inject(storageClassApiInjectable),
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
