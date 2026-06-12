/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import createUpgradeChartTabInjectable from "../dock/upgrade-chart/create-upgrade-chart-tab.injectable";
import { MenuItem } from "../menu";
import { MenuActions } from "../menu/menu-actions";
import deleteReleaseInjectable from "./delete-release/delete-release.injectable";
import openHelmReleaseRollbackDialogInjectable from "./dialog/open.injectable";

import type { HelmRelease } from "../../../common/k8s-api/endpoints/helm-releases.api";
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
}

class NonInjectedHelmReleaseMenu extends React.Component<HelmReleaseMenuProps & Dependencies> {
  remove = () => {
    return this.props.deleteRelease(this.props.release);
  };

  upgrade = () => {
    const { release, hideDetails } = this.props;

    this.props.createUpgradeChartTab(release);
    hideDetails?.();
  };

  rollback = () => {
    this.props.openRollbackDialog(this.props.release);
  };

  renderContent() {
    const { release, toolbar } = this.props;

    if (!release) return null;
    const hasRollback = release && release.getRevision() > 1;

    return (
      <>
        {hasRollback && (
          <MenuItem onClick={this.rollback}>
            <Icon material="history" interactive={toolbar} tooltip="Rollback" />
            <span className="title">Rollback</span>
          </MenuItem>
        )}
        <MenuItem onClick={this.upgrade} data-testid={`upgrade-chart-menu-item-for-${release.getId()}`}>
          <Icon material="refresh" interactive={toolbar} tooltip="Upgrade" />
          <span className="title">Upgrade</span>
        </MenuItem>
      </>
    );
  }

  render() {
    const { className, release, ...menuProps } = this.props;

    return (
      <MenuActions
        id={`menu-actions-for-release-menu-for-${release.getId()}`}
        triggerIcon={{
          material: "more_vert",
          "data-testid": `menu-actions-icon-for-release-menu-for-${release.getId()}`,
        }}
        {...menuProps}
        className={cssNames("HelmReleaseMenu", className)}
        removeAction={this.remove}
        removeConfirmationMessage={() => (
          <p>
            Remove Helm Release <b>{release.name}</b>?
          </p>
        )}
      >
        {this.renderContent()}
      </MenuActions>
    );
  }
}

export const HelmReleaseMenu = withInjectables<Dependencies, HelmReleaseMenuProps>(NonInjectedHelmReleaseMenu, {
  getProps: (di, props) => ({
    ...props,
    deleteRelease: di.inject(deleteReleaseInjectable),
    createUpgradeChartTab: di.inject(createUpgradeChartTabInjectable),
    openRollbackDialog: di.inject(openHelmReleaseRollbackDialogInjectable),
  }),
});
