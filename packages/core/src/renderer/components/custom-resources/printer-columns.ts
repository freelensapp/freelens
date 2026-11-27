/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AdditionalPrinterColumnsV1, CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";

/**
 * The printer columns of the version of `crd` that `object` is in, without
 * `Age`, which every view shows on its own. The columns of the preferred
 * version when the definition does not list the object's version, or is an
 * `apiextensions.k8s.io/v1beta1` one, whose columns are not per version.
 */
export const getPrinterColumnsOfObject = (
  crd: CustomResourceDefinition,
  object: Pick<KubeObject, "apiVersion">,
): AdditionalPrinterColumnsV1[] => {
  const separator = object.apiVersion.indexOf("/");
  const group = separator === -1 ? "" : object.apiVersion.slice(0, separator);
  const versionName = object.apiVersion.slice(separator + 1);
  const version =
    crd.apiVersion === "apiextensions.k8s.io/v1" && group === crd.getGroup()
      ? crd.spec.versions?.find(({ name }) => name === versionName)
      : undefined;

  if (!version) {
    return crd.getPrinterColumns();
  }

  return (version.additionalPrinterColumns ?? []).filter((column) => column.name.toLowerCase() !== "age");
};
