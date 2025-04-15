/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./release-details.scss";

import React from "react";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";

import type { IComputedValue } from "mobx";
import { ReleaseDetailsDrawer } from "./release-details-drawer";
import type { TargetHelmRelease } from "./target-helm-release.injectable";
import targetHelmReleaseInjectable from "./target-helm-release.injectable";

interface Dependencies {
  targetRelease: IComputedValue<TargetHelmRelease | undefined>;
}

const NonInjectedReleaseDetails = observer(({ targetRelease }: Dependencies) => {
  const release = targetRelease.get();

  return release ? <ReleaseDetailsDrawer targetRelease={release} /> : null;
});

export const ReleaseDetails = withInjectables<Dependencies>(NonInjectedReleaseDetails, {
  getProps: (di) => ({
    targetRelease: di.inject(targetHelmReleaseInjectable),
  }),
});
