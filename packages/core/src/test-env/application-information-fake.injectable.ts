/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { applicationInformationToken } from "@freelensapp/application";

export const applicationInformationFakeInjectable = getInjectable({
  id: "application-information-fake",

  instantiate: () => ({
    name: "some-product-name",
    productName: "some-product-name",
    version: "6.0.0",
    updatingIsEnabled: false,
    k8sProxyVersion: "1.1.0",
    bundledKubectlVersion: "1.31.1",
    bundledHelmVersion: "3.16.2",
    contentSecurityPolicy: "script-src 'unsafe-eval' 'self'; frame-src http://*.localhost:*/; img-src * data:",
    welcomeRoute: "/welcome",
    copyright: "some-copyright-information",
    description: "some-descriptive-text",
    dependencies: {},
  }),

  injectionToken: applicationInformationToken,
});
