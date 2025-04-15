/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./install-chart.scss";

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../../badge";
import { LogsDialog } from "../../dialog/logs-dialog";
import { Input } from "../../input";
import { NamespaceSelect } from "../../namespaces/namespace-select";
import { Select } from "../../select";
import { EditorPanel } from "../editor-panel";
import { InfoPanel } from "../info-panel";
import type { InstallChartModel } from "./install-chart-model.injectable";
import installChartModelInjectable from "./install-chart-model.injectable";

export interface InstallChartProps {
  tabId: string;
}

interface Dependencies {
  model: InstallChartModel;
}

const NonInjectedInstallChart = observer(({ model: model, tabId }: InstallChartProps & Dependencies) => {
  const installed = model.installed.get();

  if (installed) {
    return (
      <div className="InstallChartDone flex column gaps align-center justify-center">
        <p>
          <Icon material="check" big sticker />
        </p>
        <p>Installation complete!</p>
        <div className="flex gaps align-center">
          <Button
            autoFocus
            primary
            label="View Helm Release"
            onClick={prevDefault(model.navigateToInstalledRelease)}
            data-testid={`show-release-${installed.release.name}-for-${tabId}`}
          />
          <Button
            plain
            active
            label="Show Notes"
            onClick={model.executionOutput.show}
            data-testid={`show-execution-output-for-${installed.release.name}-in-${tabId}`}
          />
        </div>
        <LogsDialog
          title="Helm Chart Install"
          isOpen={model.executionOutput.isShown.get()}
          close={model.executionOutput.close}
          logs={installed.log}
        />
      </div>
    );
  }

  const { configuration, version, namespace, customName, errorInConfiguration } = model;

  return (
    <div className="InstallChart flex column">
      <InfoPanel
        tabId={tabId}
        controls={
          <div className="install-controls flex gaps align-center">
            <span>Chart</span>
            <Badge label={model.chartName} title="Repo/Name" />
            <span>Version</span>
            <Select
              className="chart-version"
              value={version.value.get()}
              options={version.options.get()}
              onChange={(changed) => version.onChange(changed?.value)}
              menuPlacement="top"
              id={`install-chart-version-select-for-${tabId}`}
            />
            <span>Namespace</span>
            <NamespaceSelect
              showIcons={false}
              menuPlacement="top"
              value={namespace.value.get()}
              onChange={namespace.onChange}
              id={`install-chart-namespace-select-for-${tabId}`}
            />
            <Input
              placeholder="Name (optional)"
              title="Release name"
              maxLength={50}
              value={customName.value.get()}
              onChange={customName.onChange}
              data-testid={`install-chart-custom-name-input-for-${tabId}`}
            />
          </div>
        }
        error={errorInConfiguration.value.get()}
        submit={model.install}
        disableSubmit={!model.isValid} // !namespace
        submitLabel="Install"
        submittingMessage="Installing..."
        showSubmitClose={false}
        cancelTestId={`cancel-install-chart-from-tab-for-${tabId}`}
        submitTestId={`install-chart-from-tab-for-${tabId}`}
        submittingTestId={`installing-chart-from-tab-${tabId}`}
      />

      {configuration.isLoading.get() && <Spinner center data-testid="install-chart-configuration-spinner" />}

      <EditorPanel
        tabId={tabId}
        value={configuration.value.get()}
        onChange={configuration.onChange}
        onError={errorInConfiguration.onChange}
        hidden={configuration.isLoading.get()}
      />
    </div>
  );
});

export const InstallChart = withInjectables<Dependencies, InstallChartProps>(
  NonInjectedInstallChart,

  {
    getPlaceholder: () => <Spinner center data-testid="install-chart-tab-spinner" />,

    getProps: async (di, props) => ({
      model: await di.inject(installChartModelInjectable, props.tabId),
      ...props,
    }),
  },
);
