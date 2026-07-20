/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import { makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { ClusterMetricsResourceType } from "../../../common/cluster-types";
import { SubTitle } from "../layout/sub-title";
import { onMultiSelectFor, Select } from "../select/select";

import type { Cluster } from "../../../common/cluster/cluster";

export interface ClusterMetricsSettingProps {
  cluster: Cluster;
}

@observer
export class ClusterMetricsSetting extends React.Component<ClusterMetricsSettingProps> {
  @observable hiddenMetrics = observable.set<string>();

  constructor(props: ClusterMetricsSettingProps) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    // Capture props before the reaction: mobx-react 9 forbids reading this.props
    // inside a derivation. The cluster object is stable and its preferences are
    // observable, so tracking the captured cluster keeps the reaction reactive.
    const { cluster } = this.props;

    this.hiddenMetrics = observable.set<string>(cluster.preferences.hiddenMetrics ?? []);

    disposeOnUnmount(this, [
      reaction(
        () => cluster.preferences.hiddenMetrics,
        () => {
          this.hiddenMetrics = observable.set<string>(cluster.preferences.hiddenMetrics ?? []);
        },
      ),
    ]);
  }

  save = () => {
    this.props.cluster.preferences.hiddenMetrics = Array.from(this.hiddenMetrics);
  };

  onChangeButton = () => {
    this.hiddenMetrics.replace(Object.keys(ClusterMetricsResourceType));
    this.save();
  };

  reset = () => {
    this.hiddenMetrics.clear();
    this.save();
  };

  renderMetricsSelect() {
    const metricResourceTypeOptions = Object.values(ClusterMetricsResourceType).map((type) => ({
      value: type,
      label: type,
      isSelected: this.hiddenMetrics.has(type),
    }));

    return (
      <>
        <Select
          id="cluster-metric-resource-type-input"
          className="grow shrink-0 basis-0"
          placeholder="Select metrics to hide..."
          isMulti
          isSearchable
          onMenuClose={this.save}
          closeMenuOnSelect={false}
          controlShouldRenderValue={false}
          options={metricResourceTypeOptions}
          onChange={onMultiSelectFor(this.hiddenMetrics)}
          formatOptionLabel={(option) => (
            <div className="flex gap-2 items-center">
              <span>{option.value}</span>
              {option.isSelected && <Icon smallest material="check" className="ml-auto" />}
            </div>
          )}
          themeName="lens"
        />
        <Button primary label="Hide all metrics" onClick={this.onChangeButton} />
        <Button primary label="Reset" onClick={this.reset} />
      </>
    );
  }

  render() {
    return (
      <div className="MetricsSelec0 mb-5">
        <SubTitle title={"Hide metrics from the UI"} />
        <div className="flex gap-2">{this.renderMetricsSelect()}</div>
      </div>
    );
  }
}
