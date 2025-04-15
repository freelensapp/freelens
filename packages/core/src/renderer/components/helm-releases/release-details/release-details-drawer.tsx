/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./release-details.scss";

import React from "react";

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import navigateToHelmReleasesInjectable from "../../../../common/front-end-routing/routes/cluster/helm/releases/navigate-to-helm-releases.injectable";
import type { ActiveThemeType } from "../../../themes/active-type.injectable";
import activeThemeTypeInjectable from "../../../themes/active-type.injectable";
import { Drawer } from "../../drawer";
import { ReleaseDetailsContent } from "./release-details-content";
import { ReleaseDetailsDrawerToolbar } from "./release-details-drawer-toolbar";
import type { TargetHelmRelease } from "./target-helm-release.injectable";

interface ReleaseDetailsDrawerProps {
  targetRelease: TargetHelmRelease;
}

interface Dependencies {
  activeThemeType: ActiveThemeType;
  closeDrawer: () => void;
}

const NonInjectedReleaseDetailsDrawer = observer(
  ({ activeThemeType, closeDrawer, targetRelease }: Dependencies & ReleaseDetailsDrawerProps) => (
    <Drawer
      className={cssNames("ReleaseDetails", activeThemeType.get())}
      usePortal={true}
      open={true}
      title={targetRelease.name}
      onClose={closeDrawer}
      testIdForClose="close-helm-release-detail"
      toolbar={<ReleaseDetailsDrawerToolbar targetRelease={targetRelease} />}
      data-testid={`helm-release-details-for-${targetRelease.namespace}/${targetRelease.name}`}
    >
      <ReleaseDetailsContent targetRelease={targetRelease} />
    </Drawer>
  ),
);

export const ReleaseDetailsDrawer = withInjectables<Dependencies, ReleaseDetailsDrawerProps>(
  NonInjectedReleaseDetailsDrawer,
  {
    getProps: (di, props) => ({
      activeThemeType: di.inject(activeThemeTypeInjectable),
      closeDrawer: di.inject(navigateToHelmReleasesInjectable),
      ...props,
    }),
  },
);
