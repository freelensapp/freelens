/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { parseKubeApi } from "@freelensapp/kube-api";

import type { KubeObject } from "@freelensapp/kube-object";

/**
 * A model class of a custom resource the extension presents with pages of its
 * own, usually a `Renderer.K8sApi.LensExtensionKubeObject` subclass.
 *
 * The host reads the resource's group and plural from the class: from
 * `crd.apiVersions` and `crd.plural` when the class has a `crd`, otherwise from
 * its static `apiBase`.
 */
export type CustomResourceRegistration = (new (
  ...args: any[]
) => KubeObject) & {
  readonly kind?: string;
  readonly apiBase?: string;
  readonly crd?: {
    readonly apiVersions: readonly string[];
    readonly plural: string;
  };
};

export interface RegisteredCustomResource {
  group: string;
  plural: string;
}

/** The key a custom resource is told apart by: its group and plural. */
export const getCustomResourceKey = (group: string, plural: string) => `${group}/${plural}`;

const groupOfApiVersion = (apiVersion: string) => {
  const separator = apiVersion.indexOf("/");

  return separator === -1 ? "" : apiVersion.slice(0, separator);
};

/**
 * The custom resources a `customResources` registration names: one per group
 * of its `crd.apiVersions`, or the one of its `apiBase`.
 *
 * Throws, with the reason, when the registration is not a class, when the class
 * has no `kind`, when it has neither a `crd` nor an `apiBase` that can be
 * parsed, when its `crd` lacks versions or a plural, or when it names a
 * resource of the core group, which has no custom resources.
 */
export const getCustomResourcesOfRegistration = (
  registration: CustomResourceRegistration,
): RegisteredCustomResource[] => {
  if (typeof registration !== "function") {
    throw new Error("it is not a class");
  }

  if (!registration.kind) {
    throw new Error('the class has no static "kind"');
  }

  const { crd } = registration;

  if (crd) {
    if (!crd.apiVersions?.length) {
      throw new Error('"crd.apiVersions" is empty');
    }

    if (!crd.plural) {
      throw new Error('"crd.plural" is empty');
    }

    const groups = new Set(crd.apiVersions.map(groupOfApiVersion));

    if (groups.has("")) {
      throw new Error('"crd.apiVersions" names the core group, which has no custom resources');
    }

    return Array.from(groups, (group) => ({ group, plural: crd.plural }));
  }

  const parsed = parseKubeApi(registration.apiBase);

  if (!parsed) {
    throw new Error('the class has neither "crd" nor a parseable static "apiBase"');
  }

  if (!parsed.apiGroup) {
    throw new Error('"apiBase" names the core group, which has no custom resources');
  }

  return [{ group: parsed.apiGroup, plural: parsed.resource }];
};

/**
 * What a `customResources` field that is not an array holds, as the error that
 * rejects the field names it.
 */
export const describeCustomResourcesField = (value: unknown) => {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "function") {
    return value.name ? `the class ${value.name}` : "an anonymous class";
  }

  return typeof value === "object" ? "an object" : `a ${typeof value}`;
};

/**
 * How a rejected registration is named in the error: its index in the field
 * and the name of its class.
 */
export const describeCustomResourceRegistration = (registration: CustomResourceRegistration, index: number) =>
  `customResources[${index}] (${(typeof registration === "function" && registration.name) || "<anonymous class>"})`;
