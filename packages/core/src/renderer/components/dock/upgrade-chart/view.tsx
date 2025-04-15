/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./upgrade-chart.scss";

import { Spinner } from "@freelensapp/spinner";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../../badge";
import type { HelmChartVersion } from "../../helm-charts/helm-charts/versions";
import type { SelectOption } from "../../select";
import { Select } from "../../select";
import type { DockTab } from "../dock/store";
import { EditorPanel } from "../editor-panel";
import { InfoPanel } from "../info-panel";
import type { UpgradeChartModel } from "./upgrade-chart-model.injectable";
import upgradeChartModelInjectable from "./upgrade-chart-model.injectable";

export interface UpgradeChartProps {
  className?: string;
  tab: DockTab;
}

interface Dependencies {
  model: UpgradeChartModel;
}

@observer
export class NonInjectedUpgradeChart extends React.Component<UpgradeChartProps & Dependencies> {
  upgrade = async () => {
    const { model } = this.props;
    const result = await model.submit();

    if (result.callWasSuccessful) {
      return (
        <p>
          {"Release "}
          <b>{model.release.getName()}</b>
          {" successfully upgraded to version "}
          <b>{model.version.value.get()?.version}</b>
        </p>
      );
    }

    throw result.error;
  };

  render() {
    const { model, className, tab } = this.props;
    const tabId = tab.id;
    const { release } = model;

    return (
      <div
        className={cssNames("UpgradeChart flex column", className)}
        data-testid={`upgrade-chart-dock-tab-contents-for-${release.getId()}`}
      >
        <InfoPanel
          tabId={tabId}
          error={model.configuration.error.get()}
          submit={this.upgrade}
          submitLabel="Upgrade"
          submittingMessage="Updating.."
          controls={
            <div className="upgrade flex gaps align-center">
              <span>Release</span> <Badge label={release.getName()} />
              <span>Namespace</span> <Badge label={release.getNs()} />
              <span>Version</span> <Badge label={release.getVersion()} />
              <span>Upgrade version</span>
              <Select<HelmChartVersion, SelectOption<HelmChartVersion>, false>
                id="char-version-input"
                className="chart-version"
                menuPlacement="top"
                value={model.version.value.get()}
                options={model.versionOptions.get()}
                onChange={model.version.set}
              />
            </div>
          }
        />
        <EditorPanel
          tabId={tabId}
          value={model.configuration.value.get()}
          onChange={model.configuration.set}
          onError={model.configuration.setError}
        />
      </div>
    );
  }
}

export const UpgradeChart = withInjectables<Dependencies, UpgradeChartProps>(NonInjectedUpgradeChart, {
  getPlaceholder: () => <Spinner center />,
  getProps: async (di, props) => ({
    ...props,
    model: await di.inject(upgradeChartModelInjectable, props.tab),
  }),
});
