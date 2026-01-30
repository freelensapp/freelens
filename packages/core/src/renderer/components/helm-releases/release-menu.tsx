/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import createUpgradeChartTabInjectable from "../dock/upgrade-chart/create-upgrade-chart-tab.injectable";
import { MenuItem } from "../menu";
import { MenuActions } from "../menu/menu-actions";
import deleteReleaseInjectable from "./delete-release/delete-release.injectable";
import openHelmReleaseRollbackDialogInjectable from "./dialog/open.injectable";

import type { HelmRelease } from "../../../common/k8s-api/endpoints/helm-releases.api";
import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { MenuActionsProps } from "../menu/menu-actions";
import type { OpenHelmReleaseRollbackDialog } from "./dialog/open.injectable";

export interface HelmReleaseMenuProps extends MenuActionsProps {
  release: HelmRelease;
  hideDetails?(): void;
}

interface Dependencies {
  deleteRelease: (release: HelmRelease) => Promise<any>;
  createUpgradeChartTab: (release: HelmRelease) => void;
  openRollbackDialog: OpenHelmReleaseRollbackDialog;
  userPreferencesState: UserPreferencesState;
}

const NonInjectedHelmReleaseMenu = observer(
  ({
    release,
    className,
    hideDetails,
    deleteRelease,
    createUpgradeChartTab,
    openRollbackDialog,
    userPreferencesState,
    ...menuProps
  }: HelmReleaseMenuProps & Dependencies) => {
    const remove = () => {
      return deleteRelease(release);
    };

    const upgrade = () => {
      createUpgradeChartTab(release);
      hideDetails?.();
    };

    const rollback = () => {
      openRollbackDialog(release);
    };

    const renderContent = () => {
      const { toolbar } = menuProps;

      if (!release) return null;
      const hasRollback = release && release.getRevision() > 1;

      return (
        <>
          {hasRollback && (
            <MenuItem onClick={rollback}>
              <Icon material="history" interactive={toolbar} tooltip="Rollback" />
              <span className="title">Rollback</span>
            </MenuItem>
          )}
          <MenuItem onClick={upgrade} data-testid={`upgrade-chart-menu-item-for-${release.getId()}`}>
            <Icon material="refresh" interactive={toolbar} tooltip="Upgrade" />
            <span className="title">Upgrade</span>
          </MenuItem>
        </>
      );
    };

    const allowDelete = userPreferencesState.allowDelete ?? true;

    return (
      <MenuActions
        id={`menu-actions-for-release-menu-for-${release.getId()}`}
        triggerIcon={{
          material: "more_vert",
          "data-testid": `menu-actions-icon-for-release-menu-for-${release.getId()}`,
        }}
        {...menuProps}
        className={cssNames("HelmReleaseMenu", className)}
        removeAction={allowDelete ? remove : undefined}
        removeConfirmationMessage={() => (
          <p>
            Remove Helm Release <b>{release.name}</b>?
          </p>
        )}
      >
        {renderContent()}
      </MenuActions>
    );
  },
);

export const HelmReleaseMenu = withInjectables<Dependencies, HelmReleaseMenuProps>(NonInjectedHelmReleaseMenu, {
  getProps: (di, props) => ({
    ...props,
    deleteRelease: di.inject(deleteReleaseInjectable),
    createUpgradeChartTab: di.inject(createUpgradeChartTabInjectable),
    openRollbackDialog: di.inject(openHelmReleaseRollbackDialogInjectable),
    userPreferencesState: di.inject(userPreferencesStateInjectable),
  }),
});
