/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { autorun, makeObservable, observable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { KubernetesCluster } from "../../../common/catalog-entities";
import type { Cluster } from "../../../common/cluster/cluster";
import { Input } from "../input";
import { isRequired } from "../input/input_validators";
import { SubTitle } from "../layout/sub-title";

export interface ClusterNameSettingProps {
  cluster: Cluster;
  entity: KubernetesCluster;
}

@observer
export class ClusterNameSetting extends React.Component<ClusterNameSettingProps> {
  @observable name = "";

  constructor(props: ClusterNameSettingProps) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(
      this,
      autorun(() => {
        this.name = this.props.cluster.preferences.clusterName || this.props.entity.getName();
      }),
    );
  }

  save = () => {
    this.props.cluster.preferences.clusterName = this.name;
  };

  onChange = (value: string) => {
    this.name = value;
  };

  render() {
    return (
      <>
        <SubTitle title="Cluster Name" />
        <Input
          theme="round-black"
          validators={isRequired}
          value={this.name}
          onChange={this.onChange}
          onBlur={this.save}
        />
      </>
    );
  }
}
