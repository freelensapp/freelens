/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { autorun, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Input } from "../input";
import { isRequired } from "../input/input_validators";
import { SubTitle } from "../layout/sub-title";

import type { KubernetesCluster } from "../../../common/catalog-entities";
import type { Cluster } from "../../../common/cluster/cluster";

export interface ClusterNameSettingProps {
  cluster: Cluster;
  entity: KubernetesCluster;
}

@observer
export class ClusterNameSetting extends React.Component<ClusterNameSettingProps> {
  private readonly disposers: (() => void)[] = [];

  @observable name = "";

  constructor(props: ClusterNameSettingProps) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    // Capture props before the autorun: mobx-react 9 forbids reading this.props
    // inside a derivation (the autorun below).
    const { cluster, entity } = this.props;

    this.disposers.push(
      autorun(() => {
        this.name = cluster.preferences.clusterName || entity.getName();
      }),
    );
  }

  componentWillUnmount() {
    this.disposers.forEach((dispose) => dispose());
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
