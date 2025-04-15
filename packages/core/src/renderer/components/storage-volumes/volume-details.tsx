/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import startCase from "lodash/startCase";
import "./volume-details.scss";

import type { PersistentVolumeClaimApi, StorageClassApi } from "@freelensapp/kube-api";
import { persistentVolumeClaimApiInjectable, storageClassApiInjectable } from "@freelensapp/kube-api-specifics";
import { PersistentVolume } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface PersistentVolumeDetailsProps extends KubeObjectDetailsProps<PersistentVolume> {}

interface Dependencies {
  logger: Logger;
  getDetailsUrl: GetDetailsUrl;
  storageClassApi: StorageClassApi;
  persistentVolumeClaimApi: PersistentVolumeClaimApi;
}

@observer
class NonInjectedPersistentVolumeDetails extends React.Component<PersistentVolumeDetailsProps & Dependencies> {
  render() {
    const { object: volume, storageClassApi, getDetailsUrl, logger, persistentVolumeClaimApi } = this.props;

    if (!volume) {
      return null;
    }

    if (!(volume instanceof PersistentVolume)) {
      logger.error("[PersistentVolumeDetails]: passed object that is not an instanceof PersistentVolume", volume);

      return null;
    }

    const {
      accessModes,
      capacity,
      persistentVolumeReclaimPolicy,
      storageClassName,
      claimRef,
      flexVolume,
      mountOptions,
      nfs,
    } = volume.spec;

    const storageClassDetailsUrl = getDetailsUrl(
      storageClassApi.formatUrlForNotListing({
        name: storageClassName,
      }),
    );

    return (
      <div className="PersistentVolumeDetails">
        <DrawerItem name="Capacity">{capacity?.storage}</DrawerItem>

        {mountOptions && <DrawerItem name="Mount Options">{mountOptions.join(", ")}</DrawerItem>}

        <DrawerItem name="Access Modes">{accessModes?.join(", ")}</DrawerItem>
        <DrawerItem name="Reclaim Policy">{persistentVolumeReclaimPolicy}</DrawerItem>
        <DrawerItem name="Storage Class Name">
          <Link key="link" to={storageClassDetailsUrl} onClick={stopPropagation}>
            {storageClassName}
          </Link>
        </DrawerItem>
        <DrawerItem name="Status" labelsOnly>
          <Badge label={volume.getStatus()} />
        </DrawerItem>

        {nfs && (
          <>
            <DrawerTitle>Network File System</DrawerTitle>
            {Object.entries(nfs).map(([name, value]) => (
              <DrawerItem key={name} name={startCase(name)}>
                {value}
              </DrawerItem>
            ))}
          </>
        )}

        {flexVolume && (
          <>
            <DrawerTitle>FlexVolume</DrawerTitle>
            <DrawerItem name="Driver">{flexVolume.driver}</DrawerItem>
            {Object.entries(flexVolume.options ?? {}).map(([name, value]) => (
              <DrawerItem key={name} name={startCase(name)}>
                {value}
              </DrawerItem>
            ))}
          </>
        )}

        {claimRef && (
          <>
            <DrawerTitle>Claim</DrawerTitle>
            <DrawerItem name="Type">{claimRef.kind}</DrawerItem>
            <DrawerItem name="Name">
              <Link to={getDetailsUrl(persistentVolumeClaimApi.formatUrlForNotListing(claimRef))}>{claimRef.name}</Link>
            </DrawerItem>
            <DrawerItem name="Namespace">{claimRef.namespace}</DrawerItem>
          </>
        )}
      </div>
    );
  }
}

export const PersistentVolumeDetails = withInjectables<Dependencies, PersistentVolumeDetailsProps>(
  NonInjectedPersistentVolumeDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
      getDetailsUrl: di.inject(getDetailsUrlInjectable),
      persistentVolumeClaimApi: di.inject(persistentVolumeClaimApiInjectable),
      storageClassApi: di.inject(storageClassApiInjectable),
    }),
  },
);
