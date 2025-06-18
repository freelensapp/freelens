/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import releaseRollbackDialogStateInjectable from "./state.injectable";

import type { HelmRelease } from "../../../../common/k8s-api/endpoints/helm-releases.api";

export type OpenHelmReleaseRollbackDialog = (release: HelmRelease) => void;

const openHelmReleaseRollbackDialogInjectable = getInjectable({
  id: "open-helm-release-dialog",
  instantiate: (di): OpenHelmReleaseRollbackDialog => {
    const state = di.inject(releaseRollbackDialogStateInjectable);

    return (release) => state.set(release);
  },
});

export default openHelmReleaseRollbackDialogInjectable;
