/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import apiKubeInjectable from "./api-kube.injectable";

import type { KubeJsonApi } from "@freelensapp/kube-api";

import type { Injectable } from "@ogre-tools/injectable";

export type ApiKubeGet = KubeJsonApi["get"];

// Annotated for declaration emit: without it the emitter expands the method
// type and reaches into node-fetch internals it cannot reference (TS2742).
const apiKubeGetInjectable: Injectable<ApiKubeGet> = getInjectable({
  id: "api-kube-get",
  instantiate: (di): ApiKubeGet => {
    const apiKube = di.inject(apiKubeInjectable);

    return (...params) => apiKube.get(...params);
  },
});

export default apiKubeGetInjectable;
