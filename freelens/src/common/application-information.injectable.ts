/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { applicationInformationToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import packageJson from "../../package.json";

const applicationInformationInjectable = getInjectable({
  id: "application-information",
  instantiate: () => {
    const {
      version,
      config: { bundledHelmVersion, bundledKubectlVersion, contentSecurityPolicy, k8sProxyVersion, welcomeRoute },
      productName,
      copyright,
      description,
      name,
      dependencies,
    } = packageJson;

    return {
      version,
      productName,
      copyright,
      description,
      name,
      k8sProxyVersion,
      bundledKubectlVersion,
      bundledHelmVersion,
      contentSecurityPolicy,
      welcomeRoute,
      updatingIsEnabled: false,
      dependencies,
    };
  },
  causesSideEffects: true,
  injectionToken: applicationInformationToken,
});

export default applicationInformationInjectable;
