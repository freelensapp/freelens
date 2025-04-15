/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { shell } from "electron";
import { observer } from "mobx-react";
import React from "react";
import type { Cluster } from "../../../common/cluster/cluster";
import { Notice } from "../extensions/notice";
import { SubTitle } from "../layout/sub-title";

export interface ClusterKubeconfigProps {
  cluster: Cluster;
}

@observer
export class ClusterKubeconfig extends React.Component<ClusterKubeconfigProps> {
  openKubeconfig = () => {
    const { cluster } = this.props;

    shell.showItemInFolder(cluster.kubeConfigPath.get());
  };

  render() {
    return (
      <Notice className="mb-14 mt-3">
        <SubTitle title="Kubeconfig" />
        <span>
          <a className="link value" onClick={this.openKubeconfig}>
            {this.props.cluster.kubeConfigPath.get()}
          </a>
        </span>
      </Notice>
    );
  }
}
