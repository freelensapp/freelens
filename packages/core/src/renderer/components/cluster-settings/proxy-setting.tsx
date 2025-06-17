/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { autorun, makeObservable, observable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { Input, InputValidators } from "../input";
import { SubTitle } from "../layout/sub-title";

import type { Cluster } from "../../../common/cluster/cluster";

export interface ClusterProxySettingProps {
  cluster: Cluster;
}

@observer
export class ClusterProxySetting extends React.Component<ClusterProxySettingProps> {
  @observable proxy = "";

  constructor(props: ClusterProxySettingProps) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(
      this,
      autorun(() => {
        this.proxy = this.props.cluster.preferences.httpsProxy || "";
      }),
    );
  }

  save = () => {
    this.props.cluster.preferences.httpsProxy = this.proxy;
  };

  onChange = (value: string) => {
    this.proxy = value;
  };

  render() {
    return (
      <>
        <SubTitle title="HTTP Proxy" id="http-proxy" />
        <Input
          theme="round-black"
          value={this.proxy}
          onChange={this.onChange}
          onBlur={this.save}
          placeholder="http://<address>:<port>"
          validators={this.proxy ? InputValidators.isUrl : undefined}
        />
        <small className="hint">HTTP Proxy server. Used for communicating with Kubernetes API.</small>
      </>
    );
  }
}
