/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./storage-classes.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { KubeObjectAge } from "../kube-object/age";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import type { StorageClassStore } from "./store";
import storageClassStoreInjectable from "./store.injectable";

enum columnId {
  name = "name",
  age = "age",
  provisioner = "provision",
  default = "default",
  reclaimPolicy = "reclaim",
}

interface Dependencies {
  storageClassStore: StorageClassStore;
}

@observer
class NonInjectedStorageClasses extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="storage_classes"
          className="StorageClasses"
          store={this.props.storageClassStore}
          sortingCallbacks={{
            [columnId.name]: (storageClass) => storageClass.getName(),
            [columnId.age]: (storageClass) => -storageClass.getCreationTimestamp(),
            [columnId.provisioner]: (storageClass) => storageClass.provisioner,
            [columnId.reclaimPolicy]: (storageClass) => storageClass.reclaimPolicy,
          }}
          searchFilters={[(storageClass) => storageClass.getSearchFields(), (storageClass) => storageClass.provisioner]}
          renderHeaderTitle="Storage Classes"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Provisioner", className: "provisioner", sortBy: columnId.provisioner, id: columnId.provisioner },
            {
              title: "Reclaim Policy",
              className: "reclaim-policy",
              sortBy: columnId.reclaimPolicy,
              id: columnId.reclaimPolicy,
            },
            { title: "Default", className: "is-default", id: columnId.default },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(storageClass) => [
            storageClass.getName(),
            <KubeObjectStatusIcon key="icon" object={storageClass} />,
            storageClass.provisioner,
            storageClass.getReclaimPolicy(),
            storageClass.isDefault() ? "Yes" : null,
            <KubeObjectAge key="age" object={storageClass} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const StorageClasses = withInjectables<Dependencies>(NonInjectedStorageClasses, {
  getProps: (di, props) => ({
    ...props,
    storageClassStore: di.inject(storageClassStoreInjectable),
  }),
});
