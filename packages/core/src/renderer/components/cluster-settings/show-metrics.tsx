/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../badge/badge";
import { Notice } from "../extensions/notice";

import type { Cluster } from "../../../common/cluster/cluster";

export interface ShowMetricsSettingProps {
  cluster: Cluster;
}

@observer
export class ShowMetricsSetting extends React.Component<ShowMetricsSettingProps> {
  private readonly disposers: (() => void)[] = [];

  @observable hiddenMetrics = observable.set<string>();

  constructor(props: ShowMetricsSettingProps) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    // Capture props before the reaction: mobx-react 9 forbids reading this.props
    // inside a derivation. The cluster object is stable and its preferences are
    // observable, so tracking the captured cluster keeps the reaction reactive.
    const { cluster } = this.props;

    this.hiddenMetrics = observable.set<string>(cluster.preferences.hiddenMetrics ?? []);

    this.disposers.push(
      reaction(
        () => cluster.preferences.hiddenMetrics,
        () => {
          this.hiddenMetrics = observable.set<string>(cluster.preferences.hiddenMetrics ?? []);
        },
      ),
    );
  }

  componentWillUnmount() {
    this.disposers.forEach((dispose) => dispose());
  }

  removeMetric(metric: string) {
    this.hiddenMetrics.delete(metric);
    this.props.cluster.preferences.hiddenMetrics = Array.from(this.hiddenMetrics);
  }

  renderMetrics() {
    const metrics = Array.from(this.hiddenMetrics);

    if (!metrics.length) {
      return <div className="flex-grow text-center">All metrics are visible on the UI</div>;
    }

    return metrics.map((name) => {
      const tooltipId = `${name}`;

      return (
        <Badge key={name} flat expandable={false}>
          <span id={tooltipId}>{name}</span>
          <Icon smallest material="clear" onClick={() => this.removeMetric(name)} tooltip="Remove" className="mx-3" />
        </Badge>
      );
    });
  }

  render() {
    return (
      <Notice>
        <div className="MetricsSelect flex flex-wrap gap-2 leading-relaxed">{this.renderMetrics()}</div>
      </Notice>
    );
  }
}
