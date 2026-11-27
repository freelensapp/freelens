/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AdditionalPrinterColumnsV1, KubeObject } from "@freelensapp/kube-object";

import type { ComponentType } from "react";

/**
 * What the host renders a printer column of a custom resource with: the
 * object, the value of the column's `jsonPath` in it, and the column as the
 * definition writes it.
 */
export interface CustomResourceColumnProps<K extends KubeObject = any> {
  object: K;
  value: unknown;
  column: AdditionalPrinterColumnsV1;
}

/**
 * How the host shows one printer column: rendered by `Render` in place of the
 * value, or left out with `hidden: true`.
 */
export type CustomResourceColumn<K extends KubeObject = any> =
  | { Render: ComponentType<CustomResourceColumnProps<K>>; hidden?: never }
  | { hidden: true; Render?: never };

/**
 * A `customResourceColumns` registration: how the host shows the printer
 * columns of the custom resource of `kind` in the `apiVersions` listed.
 * `columns` is keyed by the `name` of a printer column, exactly as the
 * definition writes it. `Renderer.K8sApi.columnsFor` builds one from a model
 * class.
 */
export interface CustomResourceColumnsRegistration<K extends KubeObject = any> {
  kind: string;
  apiVersions: string[];
  columns: Record<string, CustomResourceColumn<K>>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Checks one entry of `columns`, and throws with the reason when it has
 * neither `Render` nor `hidden: true`, or both.
 */
export const checkCustomResourceColumn = (name: string, column: unknown): void => {
  if (!isPlainObject(column)) {
    throw new Error(`columns[${JSON.stringify(name)}] is not an object`);
  }

  const hasRender = column.Render !== undefined;
  const hidden = column.hidden === true;

  if (hasRender && hidden) {
    throw new Error(`columns[${JSON.stringify(name)}] has both "Render" and "hidden: true"`);
  }

  if (!hidden && column.hidden !== undefined) {
    throw new Error(`columns[${JSON.stringify(name)}] has "hidden" that is not true`);
  }

  if (!hasRender && !hidden) {
    throw new Error(`columns[${JSON.stringify(name)}] has neither "Render" nor "hidden: true"`);
  }

  if (hasRender && typeof column.Render !== "function" && !isPlainObject(column.Render)) {
    throw new Error(`columns[${JSON.stringify(name)}].Render is not a component`);
  }
};

/**
 * Checks a `customResourceColumns` registration, and throws with the reason
 * when it is not an object, has no `kind`, has no `apiVersions` or an empty
 * list of them, or has a `columns` that is not an object or holds an entry
 * {@link checkCustomResourceColumn} rejects.
 */
export function checkCustomResourceColumnsRegistration(
  registration: unknown,
): asserts registration is CustomResourceColumnsRegistration {
  if (!isPlainObject(registration)) {
    throw new Error("it is not a registration object");
  }

  if (typeof registration.kind !== "string" || !registration.kind) {
    throw new Error('it has no "kind"');
  }

  const { apiVersions } = registration;

  if (!Array.isArray(apiVersions) || apiVersions.some((apiVersion) => typeof apiVersion !== "string")) {
    throw new Error('"apiVersions" is not an array of strings');
  }

  if (apiVersions.length === 0) {
    throw new Error('"apiVersions" is empty');
  }

  if (!isPlainObject(registration.columns)) {
    throw new Error('"columns" is not an object');
  }

  for (const [name, column] of Object.entries(registration.columns)) {
    checkCustomResourceColumn(name, column);
  }
}

/**
 * How a rejected registration is named in the error: its index in the field
 * and its kind, when it has one.
 */
export const describeCustomResourceColumnsRegistration = (registration: unknown, index: number) => {
  const kind = isPlainObject(registration) && typeof registration.kind === "string" ? registration.kind : "";

  return `customResourceColumns[${index}] (${kind || "<no kind>"})`;
};
