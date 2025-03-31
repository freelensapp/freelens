/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import packageJson from "../../package.json";
import { applicationInformationToken } from "@freelensapp/application";

const applicationInformationInjectable = getInjectable({
  id: "application-information",
  instantiate: () => {
    const {
      version,
      config: {
        bundledHelmVersion,
        bundledKubectlVersion,
        contentSecurityPolicy,
        k8sProxyVersion,
        welcomeRoute,
      },
      productName,
      build,
      copyright,
      description,
      name,
      dependencies,
    } = packageJson;

    const publish = (build as any)?.publish;

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
      updatingIsEnabled: publish instanceof Array ? publish?.length > 0 : false,
      dependencies,
    };
  },
  causesSideEffects: true,
  injectionToken: applicationInformationToken,
});

export default applicationInformationInjectable;
