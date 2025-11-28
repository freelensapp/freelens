/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { waitUntilDefined } from "@freelensapp/utilities";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { action, computed, observable, when } from "mobx";
import requestHelmReleaseConfigurationInjectable from "../../../../common/k8s-api/endpoints/helm-releases.api/request-configuration.injectable";
import helmChartVersionsInjectable from "../../helm-charts/helm-charts/versions.injectable";
import releasesInjectable from "../../helm-releases/releases.injectable";
import updateReleaseInjectable from "../../helm-releases/update-release/update-release.injectable";
import upgradeChartTabDataInjectable from "./tab-data.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";
import type { SingleValue } from "react-select";

import type { HelmRelease } from "../../../../common/k8s-api/endpoints/helm-releases.api";
import type { HelmChartVersion } from "../../helm-charts/helm-charts/versions";
import type { SelectOption } from "../../select";
import type { DockTab } from "../dock/store";

export interface UpgradeChartModel {
  readonly release: HelmRelease;
  readonly versionOptions: IComputedValue<SelectOption<HelmChartVersion>[]>;
  readonly configuration: {
    readonly value: IComputedValue<string>;
    set: (value: string) => void;
    readonly error: IComputedValue<string | undefined>;
    setError: (error: unknown) => void;
  };
  readonly version: {
    readonly value: IComputedValue<HelmChartVersion | undefined>;
    set: (value: SingleValue<SelectOption<HelmChartVersion>>) => void;
  };
  readonly forceConflicts: {
    readonly value: IComputedValue<boolean>;
    set: (value: boolean) => void;
  };
  submit: () => AsyncResult<void, string>;
}

const upgradeChartModelInjectable = getInjectable({
  id: "upgrade-chart-model",
  instantiate: async (di, tab): Promise<UpgradeChartModel> => {
    const releases = di.inject(releasesInjectable);
    const requestHelmReleaseConfiguration = di.inject(requestHelmReleaseConfigurationInjectable);
    const updateRelease = di.inject(updateReleaseInjectable);
    const tabData = await di.inject(upgradeChartTabDataInjectable, tab.id);

    const release = await waitUntilDefined(() =>
      releases.value
        .get()
        .find((release) => release.getName() === tabData.releaseName && release.getNs() === tabData.releaseNamespace),
    );

    const versions = di.inject(helmChartVersionsInjectable, release);

    const storedConfiguration = asyncComputed({
      getValueFromObservedPromise: () => requestHelmReleaseConfiguration(release.getName(), release.getNs(), true),

      valueWhenPending: "",
    });

    await when(() => !versions.pending.get());

    const configrationValue = observable.box<string>();
    const configrationEditError = observable.box<string>();
    const configration: UpgradeChartModel["configuration"] = {
      value: computed(() => configrationValue.get() ?? storedConfiguration.value.get()),
      set: action((value) => {
        configrationValue.set(value);
        configrationEditError.set(undefined);
      }),
      error: computed(() => configrationEditError.get()),
      setError: action((error) => configrationEditError.set(String(error))),
    };
    const versionValue = observable.box<HelmChartVersion>(undefined, {
      deep: false,
    });
    const version: UpgradeChartModel["version"] = {
      value: computed(() => versionValue.get() ?? versions.value.get()[0]),
      set: action((option) => versionValue.set(option?.value)),
    };
    const forceConflictsValue = observable.box<boolean>(false);
    const forceConflicts: UpgradeChartModel["forceConflicts"] = {
      value: computed(() => forceConflictsValue.get()),
      set: action((value) => forceConflictsValue.set(value)),
    };
    const versionOptions = computed(() =>
      versions.value.get().map((version) => ({
        value: version,
        label: `${version.repo}/${release.getChart()}-${version.version}`,
      })),
    );

    return {
      release,
      versionOptions,
      configuration: configration,
      version,
      forceConflicts,
      submit: async () => {
        const selectedVersion = version.value.get();

        if (!selectedVersion) {
          return {
            callWasSuccessful: false,
            error: "No selected version",
          };
        }

        const editError = configrationEditError.get();

        if (editError) {
          return {
            callWasSuccessful: false,
            error: editError,
          };
        }

        const result = await updateRelease(release.getName(), release.getNs(), {
          chart: release.getChart(),
          values: configration.value.get(),
          forceConflicts: forceConflicts.value.get(),
          ...selectedVersion,
        });

        if (result.callWasSuccessful === true) {
          storedConfiguration.invalidate();

          return { callWasSuccessful: true };
        }

        return {
          callWasSuccessful: false,
          error: String(result.error),
        };
      },
    };
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, tab: DockTab) => tab.id,
  }),
});

export default upgradeChartModelInjectable;
