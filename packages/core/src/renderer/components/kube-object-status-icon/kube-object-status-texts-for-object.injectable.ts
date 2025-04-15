/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { conforms, eq, includes } from "lodash/fp";
import { computed } from "mobx";
import kubeObjectStatusTextsInjectable from "./kube-object-status-texts.injectable";

const kubeObjectStatusTextsForObjectInjectable = getInjectable({
  id: "kube-object-status-texts-for-object",

  instantiate: (di, kubeObject: KubeObject) => {
    const allStatusTexts = di.inject(kubeObjectStatusTextsInjectable);

    return computed(() => allStatusTexts.get().filter(toKubeObjectRelated(kubeObject)));
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, kubeObject: KubeObject) => kubeObject.getId(),
  }),
});

const toKubeObjectRelated = (kubeObject: KubeObject) =>
  conforms({
    kind: eq(kubeObject.kind),
    apiVersions: includes(kubeObject.apiVersion),
  });

export default kubeObjectStatusTextsForObjectInjectable;
