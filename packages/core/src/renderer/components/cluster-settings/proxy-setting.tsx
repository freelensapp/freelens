/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { autorun, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Input, InputValidators } from "../input";
import { SubTitle } from "../layout/sub-title";

import type { Cluster } from "../../../common/cluster/cluster";

export interface ClusterProxySettingProps {
  cluster: Cluster;
}

@observer
export class ClusterProxySetting extends React.Component<ClusterProxySettingProps> {
  private readonly disposers: (() => void)[] = [];

  @observable accessor proxy = "";

  constructor(props: ClusterProxySettingProps) {
    super(props);
  }

  componentDidMount() {
    // Capture the cluster before the autorun: mobx-react 9 forbids reading
    // this.props inside a derivation (the autorun below).
    const { cluster } = this.props;

    this.disposers.push(
      autorun(() => {
        this.proxy = cluster.preferences.httpsProxy || "";
      }),
    );
  }

  componentWillUnmount() {
    this.disposers.forEach((dispose) => dispose());
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
        <small className="hint">
          Proxy for the connections of the views of this cluster to its Kubernetes API. Takes an http://, https:// or
          socks5:// URL. A proxy-url in the kubeconfig takes precedence. It is also HTTPS_PROXY in the terminal of this
          cluster. Reconnect the cluster and reopen its terminal after changing it.
        </small>
      </>
    );
  }
}
