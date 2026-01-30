/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "../item-object-list/item-list-layout.scss";
import "./releases.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { kebabCase } from "lodash/fp";
import moment from "moment-timezone";
import React, { Component } from "react";
import navigateToHelmReleasesInjectable from "../../../common/front-end-routing/routes/cluster/helm/releases/navigate-to-helm-releases.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { ItemListLayout } from "../item-object-list";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { NamespaceSelectFilter } from "../namespaces/namespace-select-filter";
import { WithTooltip } from "../with-tooltip";
import { ReleaseRollbackDialog } from "./dialog/dialog";
import helmReleasesRouteParametersInjectable from "./helm-releases-route-parameters.injectable";
import { HelmReleaseMenu } from "./release-menu";
import releasesInjectable from "./releases.injectable";
import removableReleasesInjectable from "./removable-releases.injectable";

import type { IComputedValue } from "mobx";

import type { NavigateToHelmReleases } from "../../../common/front-end-routing/routes/cluster/helm/releases/navigate-to-helm-releases.injectable";
import type { HelmRelease } from "../../../common/k8s-api/endpoints/helm-releases.api";
import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { ItemListStore } from "../item-object-list";
import type { RemovableHelmRelease } from "./removable-releases";

enum columnId {
  name = "name",
  namespace = "namespace",
  revision = "revision",
  chart = "chart",
  version = "version",
  appVersion = "app-version",
  status = "status",
  updated = "update",
}

interface Dependencies {
  releases: IComputedValue<RemovableHelmRelease[]>;
  releasesArePending: IComputedValue<boolean>;
  namespace: IComputedValue<string>;
  navigateToHelmReleases: NavigateToHelmReleases;
  userPreferencesState: UserPreferencesState;
}

class NonInjectedHelmReleases extends Component<Dependencies> {
  onDetails = (item: HelmRelease) => {
    this.showDetails(item);
  };

  showDetails = (item: HelmRelease) => {
    this.props.navigateToHelmReleases({
      name: item.getName(),
      namespace: item.getNs(),
    });
  };

  hideDetails = () => {
    this.props.navigateToHelmReleases();
  };

  renderRemoveDialogMessage(selectedItems: HelmRelease[]) {
    const releaseNames = selectedItems.map((item) => item.getName()).join(", ");

    return (
      <div>
        <>
          Remove <b>{releaseNames}</b>?
        </>
        <p className="warning">Note: StatefulSet Volumes won&apos;t be deleted automatically</p>
      </div>
    );
  }

  render() {
    const releases = this.props.releases;
    const releasesArePending = this.props.releasesArePending;

    // TODO: Implement ItemListLayout without stateful stores
    const legacyReleaseStore: ItemListStore<RemovableHelmRelease, false> = {
      get isLoaded() {
        return !releasesArePending.get();
      },

      failedLoading: false,

      getTotalCount: () => releases.get().length,

      toggleSelection: (release) => release.toggle(),

      isSelectedAll: (releases) => releases.length > 0 && releases.every((release) => release.isSelected),

      toggleSelectionAll: (releases) => {
        let selected = false;

        if (!legacyReleaseStore.isSelectedAll(releases)) {
          selected = true;
        }

        for (const release of releases) {
          if (release.isSelected !== selected) {
            release.toggle();
          }
        }
      },

      isSelected: (release) => release.isSelected,

      pickOnlySelected: (releases) => releases.filter((release) => release.isSelected),

      removeSelectedItems: async () => {
        if (this.props.userPreferencesState.allowDelete !== false) {
          await Promise.all(
            releases
              .get()
              .filter((release) => release.isSelected)
              .map((release) => release.delete()),
          );
        }
      },
    };

    return (
      <SiblingsInTabLayout>
        <ItemListLayout<RemovableHelmRelease, false>
          store={legacyReleaseStore}
          getItems={() => releases.get()}
          preloadStores={false}
          isConfigurable
          tableId="helm_releases"
          className="HelmReleases"
          customizeTableRowProps={(item) => ({ testId: `helm-release-row-for-${item.getId()}` })}
          sortingCallbacks={{
            [columnId.name]: (release) => release.getName(),
            [columnId.namespace]: (release) => release.getNs(),
            [columnId.revision]: (release) => release.getRevision(),
            [columnId.chart]: (release) => release.getChart(),
            [columnId.status]: (release) => release.getStatus(),
            [columnId.updated]: (release) => release.getUpdated(false, false),
          }}
          searchFilters={[
            (release) => release.getName(),
            (release) => release.getNs(),
            (release) => release.getChart(),
            (release) => release.getStatus(),
            (release) => release.getVersion(),
          ]}
          customizeHeader={({ filters, searchProps, ...headerPlaceholders }) => ({
            filters: (
              <>
                {filters}
                <NamespaceSelectFilter id="namespace-select-filter" />
              </>
            ),
            searchProps: {
              ...searchProps,
              placeholder: "Search Releases...",
            },
            ...headerPlaceholders,
          })}
          renderHeaderTitle="Releases"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Chart", className: "chart", sortBy: columnId.chart, id: columnId.chart },
            { title: "Revision", className: "revision", sortBy: columnId.revision, id: columnId.revision },
            { title: "Version", className: "version", id: columnId.version },
            { title: "App Version", className: "app-version", id: columnId.appVersion },
            { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
            { title: "Updated", className: "updated", sortBy: columnId.updated, id: columnId.updated },
          ]}
          renderTableContents={(release) => [
            <WithTooltip>{release.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={release.getNs()} />,
            <WithTooltip>{release.getChart()}</WithTooltip>,
            <WithTooltip>{release.getRevision()}</WithTooltip>,
            <WithTooltip>{release.getVersion()}</WithTooltip>,
            <WithTooltip>{release.appVersion}</WithTooltip>,
            { title: release.getStatus(), className: kebabCase(release.getStatus()) },
            <WithTooltip tooltip={release.updated ? moment(release.updated.replace(/\s\w*$/, "")).toDate() : undefined}>
              {release.getUpdated()}
            </WithTooltip>,
          ]}
          renderItemMenu={(release) => (
            <HelmReleaseMenu release={release} removeConfirmationMessage={this.renderRemoveDialogMessage([release])} />
          )}
          customizeRemoveDialog={(selectedItems) => ({
            message: this.renderRemoveDialogMessage(selectedItems),
          })}
          onDetails={this.onDetails}
          spinnerTestId="helm-releases-spinner"
        />

        <ReleaseRollbackDialog />
      </SiblingsInTabLayout>
    );
  }
}

export const HelmReleases = withInjectables<Dependencies>(NonInjectedHelmReleases, {
  getProps: (di) => ({
    releases: di.inject(removableReleasesInjectable),
    releasesArePending: di.inject(releasesInjectable).pending,
    navigateToHelmReleases: di.inject(navigateToHelmReleasesInjectable),
    userPreferencesState: di.inject(userPreferencesStateInjectable),
    ...di.inject(helmReleasesRouteParametersInjectable),
  }),
});
