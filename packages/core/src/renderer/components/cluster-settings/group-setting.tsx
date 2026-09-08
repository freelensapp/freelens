/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { autorun, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Input } from "../input";
import { SubTitle } from "../layout/sub-title";

import type { Cluster } from "../../../common/cluster/cluster";

export interface ClusterGroupSettingProps {
  cluster: Cluster;
}

@observer
export class ClusterGroupSetting extends React.Component<ClusterGroupSettingProps> {
  private readonly disposers: (() => void)[] = [];

  @observable group = "";

  constructor(props: ClusterGroupSettingProps) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    const { cluster } = this.props;

    this.disposers.push(
      autorun(() => {
        this.group = cluster.preferences.group || "";
      }),
    );
  }

  componentWillUnmount() {
    this.disposers.forEach((dispose) => dispose());
  }

  save = () => {
    this.props.cluster.preferences.group = this.group.trim() || undefined;
  };

  onChange = (value: string) => {
    this.group = value;
  };

  render() {
    return (
      <>
        <SubTitle title="Group" />
        <Input theme="round-black" value={this.group} onChange={this.onChange} onBlur={this.save} />
        <small className="hint">
          Clusters sharing the same group tag are shown together in the hotbar sidebar when arranged adjacently.
        </small>
      </>
    );
  }
}
