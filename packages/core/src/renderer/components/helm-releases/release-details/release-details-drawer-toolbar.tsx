/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./release-details.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import navigateToHelmReleasesInjectable from "../../../../common/front-end-routing/routes/cluster/helm/releases/navigate-to-helm-releases.injectable";
import { HelmReleaseMenu } from "../release-menu";
import releaseDetailsModelInjectable from "./release-details-model/release-details-model.injectable";

import type { ReleaseDetailsModel } from "./release-details-model/release-details-model.injectable";
import type { TargetHelmRelease } from "./target-helm-release.injectable";

interface ReleaseDetailsDrawerProps {
  targetRelease: TargetHelmRelease;
}

interface Dependencies {
  model: ReleaseDetailsModel;
  navigateToHelmReleases: () => void;
}

const NonInjectedReleaseDetailsDrawerToolbar = observer(
  ({ model, navigateToHelmReleases }: Dependencies & ReleaseDetailsDrawerProps) =>
    model.loadingError.get() ? null : (
      <HelmReleaseMenu release={model.release} toolbar hideDetails={navigateToHelmReleases} />
    ),
);

export const ReleaseDetailsDrawerToolbar = withInjectables<Dependencies, ReleaseDetailsDrawerProps>(
  NonInjectedReleaseDetailsDrawerToolbar,
  {
    getPlaceholder: () => <></>,

    getProps: async (di, props) => ({
      model: await di.inject(releaseDetailsModelInjectable, props.targetRelease),
      navigateToHelmReleases: di.inject(navigateToHelmReleasesInjectable),
      ...props,
    }),
  },
);
