/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./volumes.scss";

import { persistentVolumeClaimApiInjectable, storageClassApiInjectable } from "@freelensapp/kube-api-specifics";
import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { WithTooltip } from "../with-tooltip";
import persistentVolumeStoreInjectable from "./store.injectable";

import type { PersistentVolumeClaimApi, StorageClassApi } from "@freelensapp/kube-api";

import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import type { PersistentVolumeStore } from "./store";

enum columnId {
  name = "name",
  storageClass = "storage-class",
  capacity = "capacity",
  claim = "claim",
  status = "status",
  age = "age",
}

interface Dependencies {
  storageClassApi: StorageClassApi;
  persistentVolumeStore: PersistentVolumeStore;
  persistentVolumeClaimApi: PersistentVolumeClaimApi;
  getDetailsUrl: GetDetailsUrl;
}

@observer
class NonInjectedPersistentVolumes extends React.Component<Dependencies> {
  render() {
    const { getDetailsUrl, persistentVolumeStore, storageClassApi, persistentVolumeClaimApi } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="storage_volumes"
          className="PersistentVolumes"
          store={persistentVolumeStore}
          sortingCallbacks={{
            [columnId.name]: (volume) => volume.getName(),
            [columnId.storageClass]: (volume) => volume.getStorageClass(),
            [columnId.capacity]: (volume) => volume.getCapacity(true),
            [columnId.status]: (volume) => volume.getStatus(),
            [columnId.age]: (volume) => -volume.getCreationTimestamp(),
          }}
          searchFilters={[(volume) => volume.getSearchFields(), (volume) => volume.getClaimRefName()]}
          renderHeaderTitle="Persistent Volumes"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            {
              title: "Storage Class",
              className: "storageClass",
              sortBy: columnId.storageClass,
              id: columnId.storageClass,
            },
            { title: "Capacity", className: "capacity", sortBy: columnId.capacity, id: columnId.capacity },
            { title: "Claim", className: "claim", id: columnId.claim },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
          ]}
          renderTableContents={(volume) => {
            const { claimRef, storageClassName } = volume.spec;
            const storageClassDetailsUrl = getDetailsUrl(
              storageClassApi.formatUrlForNotListing({
                name: storageClassName,
              }),
            );

            return [
              <WithTooltip>{volume.getName()}</WithTooltip>,
              <KubeObjectStatusIcon key="icon" object={volume} />,
              <Link key="link" to={storageClassDetailsUrl} onClick={stopPropagation}>
                <WithTooltip>{storageClassName}</WithTooltip>
              </Link>,
              <WithTooltip>{volume.getCapacity()}</WithTooltip>,
              claimRef && (
                <Link
                  to={getDetailsUrl(persistentVolumeClaimApi.formatUrlForNotListing(claimRef))}
                  onClick={stopPropagation}
                >
                  <WithTooltip>{claimRef.name}</WithTooltip>
                </Link>
              ),
              <KubeObjectAge key="age" object={volume} />,
              { title: volume.getStatus(), className: volume.getStatus().toLowerCase() },
            ];
          }}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const PersistentVolumes = withInjectables<Dependencies>(NonInjectedPersistentVolumes, {
  getProps: (di, props) => ({
    ...props,
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
    persistentVolumeClaimApi: di.inject(persistentVolumeClaimApiInjectable),
    persistentVolumeStore: di.inject(persistentVolumeStoreInjectable),
    storageClassApi: di.inject(storageClassApiInjectable),
  }),
});
