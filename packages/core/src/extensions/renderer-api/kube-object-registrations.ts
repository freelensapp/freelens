/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { parseKubeApi } from "@freelensapp/kube-api";

import type { KubeObject } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";
import type { ComponentType } from "react";

import type { KubeObjectDetailRegistration } from "../../renderer/components/kube-object-details/kube-object-detail-registration";
import type { KubeObjectDetailsProps } from "../../renderer/components/kube-object-details/kube-object-details";
import type {
  KubeObjectMenuItemProps,
  KubeObjectMenuRegistration,
} from "../../renderer/components/kube-object-menu/kube-object-menu-registration";

/**
 * A model class: a built-in one such as `Renderer.K8sApi.Pod`, or an
 * extension's own `Renderer.K8sApi.LensExtensionKubeObject` subclass.
 */
type KubeObjectClass<K extends KubeObject> = (new (
  ...args: any[]
) => K) & {
  readonly kind?: string;
  readonly apiBase?: string;
  readonly crd?: { readonly apiVersions: readonly string[] };
};

interface KubeObjectDetailItemOptions<K extends KubeObject> {
  Details: ComponentType<KubeObjectDetailsProps<K>>;
  /** Overrides the versions derived from the class. */
  apiVersions?: readonly string[];
  priority?: number;
  visible?: IComputedValue<boolean>;
}

interface KubeObjectMenuItemOptions<K extends KubeObject> {
  MenuItem: ComponentType<KubeObjectMenuItemProps<K>>;
  /** Overrides the versions derived from the class. */
  apiVersions?: readonly string[];
  visible?: IComputedValue<boolean>;
}

const describeClass = (helper: string, kubeObjectClass: KubeObjectClass<KubeObject>) =>
  `${helper}(${kubeObjectClass.name || "<anonymous class>"})`;

const kindOf = (helper: string, kubeObjectClass: KubeObjectClass<KubeObject>): string => {
  const { kind } = kubeObjectClass;

  if (!kind) {
    throw new Error(`${describeClass(helper, kubeObjectClass)}: the class has no static "kind"`);
  }

  return kind;
};

/**
 * The explicit `apiVersions` if given, otherwise the `crd.apiVersions` of a
 * `LensExtensionKubeObject` subclass, otherwise the group and version of the
 * class's `apiBase`.
 */
const apiVersionsOf = (
  helper: string,
  kubeObjectClass: KubeObjectClass<KubeObject>,
  apiVersions: readonly string[] | undefined,
): string[] => {
  const resolved = apiVersions ?? kubeObjectClass.crd?.apiVersions;

  if (resolved) {
    if (resolved.length === 0) {
      throw new Error(
        `${describeClass(helper, kubeObjectClass)}: ${apiVersions ? '"apiVersions"' : '"crd.apiVersions"'} is empty`,
      );
    }

    return [...resolved];
  }

  const fromApiBase = parseKubeApi(kubeObjectClass.apiBase)?.apiVersionWithGroup;

  if (!fromApiBase) {
    throw new Error(
      `${describeClass(helper, kubeObjectClass)}: no "apiVersions" given, and the class has neither "crd.apiVersions" nor a parseable static "apiBase"`,
    );
  }

  return [fromApiBase];
};

/**
 * A `kubeObjectDetailItems` registration for `kubeObjectClass`, with `kind`
 * and `apiVersions` taken from the class, and `Details` checked against it: a
 * component written for another kind does not compile.
 *
 * `apiVersions` is, in this order, the one given; the `crd.apiVersions` of a
 * `LensExtensionKubeObject` subclass; the group and version of the class's
 * `apiBase`. Give it when the cluster may serve the resource under a version
 * the class does not name, or the registration does not match those objects.
 *
 * Throws when the class has no `kind` or no source of `apiVersions`, so an
 * extension that calls it from a field initializer fails to load instead of
 * contributing a registration that never appears.
 *
 * The check is structural: two models of the same shape are not told apart,
 * and neither are two whose `spec` types differ only in optional fields, as
 * the classes of two versions of one kind usually do. A model class that
 * declares its instance `kind` and `apiVersion` as literal types
 * (`declare apiVersion: "example.com/v1"`) is told apart from the others.
 *
 * @example
 *
 * ```ts
 * kubeObjectDetailItems = [
 *   Renderer.K8sApi.detailsFor(Gateway, { priority: 10, Details: GatewayDetails }),
 * ];
 * ```
 */
export function detailsFor<K extends KubeObject>(
  kubeObjectClass: KubeObjectClass<K>,
  registration: KubeObjectDetailItemOptions<K>,
): KubeObjectDetailRegistration {
  const { Details, apiVersions, priority, visible } = registration;

  return {
    kind: kindOf("detailsFor", kubeObjectClass),
    apiVersions: apiVersionsOf("detailsFor", kubeObjectClass, apiVersions),
    components: { Details },
    ...(priority === undefined ? {} : { priority }),
    ...(visible === undefined ? {} : { visible }),
  };
}

/**
 * A `kubeObjectMenuItems` registration for `kubeObjectClass`, with `kind` and
 * `apiVersions` taken from the class, and `MenuItem` checked against it: a
 * component written for another kind does not compile.
 *
 * `apiVersions` is resolved, and the helper throws, as for {@link detailsFor}.
 *
 * @example
 *
 * ```ts
 * kubeObjectMenuItems = [
 *   Renderer.K8sApi.menuItemFor(Gateway, { MenuItem: GatewayMenuItem }),
 * ];
 * ```
 */
export function menuItemFor<K extends KubeObject>(
  kubeObjectClass: KubeObjectClass<K>,
  registration: KubeObjectMenuItemOptions<K>,
): KubeObjectMenuRegistration {
  const { MenuItem, apiVersions, visible } = registration;

  return {
    kind: kindOf("menuItemFor", kubeObjectClass),
    apiVersions: apiVersionsOf("menuItemFor", kubeObjectClass, apiVersions),
    components: { MenuItem },
    ...(visible === undefined ? {} : { visible }),
  };
}
