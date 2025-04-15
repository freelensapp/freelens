/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import type { Cluster } from "../../../common/cluster/cluster";
import { EditableList } from "../editable-list";
import { systemName } from "../input/input_validators";
import { SubTitle } from "../layout/sub-title";

export interface ClusterAccessibleNamespacesProps {
  cluster: Cluster;
}

@observer
export class ClusterAccessibleNamespaces extends React.Component<ClusterAccessibleNamespacesProps> {
  @observable namespaces = new Set(this.props.cluster.accessibleNamespaces);

  constructor(props: ClusterAccessibleNamespacesProps) {
    super(props);
    makeObservable(this);
  }

  render() {
    return (
      <>
        <SubTitle title="Accessible Namespaces" id="accessible-namespaces" />
        <EditableList
          placeholder="Add new namespace..."
          add={(newNamespace) => {
            this.namespaces.add(newNamespace);
            this.props.cluster.accessibleNamespaces.replace([...this.namespaces]);
          }}
          validators={systemName}
          items={Array.from(this.namespaces)}
          remove={({ oldItem: oldNamespace }) => {
            this.namespaces.delete(oldNamespace);
            this.props.cluster.accessibleNamespaces.replace([...this.namespaces]);
          }}
          inputTheme="round-black"
        />
        <small className="hint">
          This setting is useful for manually specifying which namespaces you have access to. This is useful when you do
          not have permissions to list namespaces.
        </small>
      </>
    );
  }
}
