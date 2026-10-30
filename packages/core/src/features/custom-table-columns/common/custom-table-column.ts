/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * A column defined by the user instead of by the application.
 *
 * The `kind` and `apiVersion` fields are matched against `KubeApi.kind` and
 * `KubeApi.apiVersionWithGroup`, the same way the columns contributed through
 * `kubeObjectListLayoutColumnInjectionToken` are, so built-in resources and custom resources are
 * covered by the same matching.
 */
export interface CustomTableColumn {
  /**
   * Stable and unique across all custom columns.
   *
   * It is used as the table cell id, which makes it the key for column visibility
   * (`hiddenTableColumns`), for column resizing and for sorting.
   */
  id: string;

  /**
   * The kind of the resource this column is shown for, e.g. `Node`.
   */
  kind: string;

  /**
   * The api version(s) of the resource this column is shown for, e.g. `v1` or `apps/v1`.
   */
  apiVersion: string | string[];

  /**
   * The text shown in the column header.
   */
  title: string;

  /**
   * A kubectl flavoured JSONPath expression evaluated against each item of the list,
   * e.g. `.metadata.labels['node.kubernetes.io/instance-type']`.
   */
  jsonPath: string;

  /**
   * Which clusters this column applies to. When it is missing, the column applies to every
   * cluster.
   *
   * Nothing reads it yet. It is part of the stored shape from the start so that a per cluster mode
   * can be added later without migrating the preferences file.
   */
  scope?: CustomTableColumnScope;

  /**
   * The id of the column this one is placed after.
   *
   * Positions are stored as an anchor rather than as a number because the two list styles use
   * different priority scales: columns coming from `renderTableHeader` are spaced by `20 - index`
   * while the columns contributed through an injection token use their own constants. A stored
   * number would therefore mean a different position in each list.
   *
   * When it is missing, or names a column that the list does not have, the column is appended.
   */
  after?: string;
}

export interface CustomTableColumnScope {
  cluster: string;
}

export const customTableColumnIdPrefix = "custom-column:";

export function isCustomTableColumnId(columnId: string | undefined): boolean {
  return typeof columnId === "string" && columnId.startsWith(customTableColumnIdPrefix);
}

const unsafeInClassName = /[^a-zA-Z0-9_-]+/g;

/**
 * The part of a column id that is safe to put in a class name or a test id.
 *
 * Ids added through the application carry the prefix and a generated suffix, but a configuration
 * written by hand may use anything, so what cannot appear in a class name is replaced rather than
 * assumed away.
 */
export function customTableColumnSlug(columnId: string): string {
  const withoutPrefix = isCustomTableColumnId(columnId) ? columnId.slice(customTableColumnIdPrefix.length) : columnId;

  return withoutPrefix.replace(unsafeInClassName, "-");
}

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const isCustomTableColumnScope = (value: unknown): value is CustomTableColumnScope =>
  typeof value === "object" && value !== null && isNonEmptyString((value as Partial<CustomTableColumnScope>).cluster);

/**
 * Guards against a hand edited, or otherwise broken, entry in the preferences file taking down
 * every list that would render it.
 */
export function isCustomTableColumn(value: unknown): value is CustomTableColumn {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const column = value as Partial<CustomTableColumn>;

  return (
    isNonEmptyString(column.id) &&
    isNonEmptyString(column.kind) &&
    isNonEmptyString(column.title) &&
    isNonEmptyString(column.jsonPath) &&
    (isNonEmptyString(column.apiVersion) ||
      (Array.isArray(column.apiVersion) &&
        column.apiVersion.length > 0 &&
        column.apiVersion.every(isNonEmptyString))) &&
    (column.after === undefined || isNonEmptyString(column.after)) &&
    (column.scope === undefined || isCustomTableColumnScope(column.scope))
  );
}
