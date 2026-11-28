/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./status-card.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { useRef } from "react";
import { Card } from "../card";

import type { ReactNode } from "react";

/**
 * How a status counts: `healthy` counts towards the share that is healthy, `failing` towards the number that
 * fail, and `neutral`, the default, towards neither.
 */
export type StatusCardTone = "healthy" | "neutral" | "failing";

export interface StatusCardStatus {
  /** The name of the status in the legend: "Running". */
  label: string;
  /**
   * How many items have the status. A status without items is not shown: its row of the legend closes, and opens
   * again when the status gets items.
   */
  count: number;
  /**
   * The color of the status in the bar and the legend, as a CSS color. Use a color of the theme, such as
   * `var(--colorOk)`, so that the card follows the theme.
   */
  color: string;
  tone?: StatusCardTone;
}

export interface StatusCardProps {
  /** The name of what is counted, the heading of the card: "Pods". */
  title: string;
  /** The number of items, the headline number of the card. Defaults to the sum of the counts. */
  total?: number;
  /** The statuses in the order of the bar and the legend, from healthy to failing. */
  statuses: readonly StatusCardStatus[];
  /** What the card says when there are no items. */
  emptyText?: string;
  /** What the card says when there are items, but none of them has a status. */
  noStatusText?: string;
  /** Makes the whole card a button that calls it, from a click and from the keyboard. */
  onClick?: () => void;
  className?: string;
  /** The test id of the card. Its parts get test ids of their own that start with it. */
  "data-testid"?: string;
}

const percentOf = (value: number, total: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "—");

const sumOf = (statuses: readonly StatusCardStatus[]) => statuses.reduce((sum, status) => sum + status.count, 0);

const toTestId = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

const partTestId = (testId: string | undefined, part: string) => (testId ? `${testId}-${part}` : undefined);

/**
 * The React key of each status: its label, so that the row and the segment of a status keep their elements while
 * the statuses before them come and go. The labels of a card are meant to be distinct; a repeated one gets the
 * number of its occurrence, so that its keys stay unique.
 */
const keysOf = (statuses: readonly StatusCardStatus[]) => {
  const seen = new Map<string, number>();

  return statuses.map(({ label }) => {
    const occurrence = seen.get(label) ?? 0;

    seen.set(label, occurrence + 1);

    return occurrence === 0 ? label : `${label}\n${occurrence}`;
  });
};

const isShown = (status: StatusCardStatus) => Number.isFinite(status.count) && status.count > 0;

/** A row of the legend and its segment of the bar. */
interface StatusRow {
  key: string;
  /** The status as the row shows it: the one given, or for a row that is closing, the last one with items. */
  status: StatusCardStatus;
  percent: string;
  /** Whether the status has items. A row of a status without items is collapsed, and not part of the card. */
  shown: boolean;
}

interface StatusRowMemory {
  /** The keys of the rows of the last render, in their order. */
  keys: readonly string[];
  /** The last row with items of each key, which a collapsed row keeps showing while it closes. */
  lastShown: Map<string, StatusRow>;
  /** The empty text the card showed last, which it keeps showing while the text closes. */
  emptyText?: string;
}

/**
 * The keys of the rows: the given ones in their order, and the ones of the last render that are no longer given,
 * each after the row it followed, so that a row that closes stays in its place.
 */
const mergeKeys = (previous: readonly string[], given: readonly string[]) => {
  const givenKeys = new Set(given);
  const goneAfter = new Map<string | undefined, string[]>();
  let anchor: string | undefined;

  for (const key of previous) {
    if (givenKeys.has(key)) {
      anchor = key;
    } else {
      goneAfter.set(anchor, [...(goneAfter.get(anchor) ?? []), key]);
    }
  }

  return [...(goneAfter.get(undefined) ?? []), ...given.flatMap((key) => [key, ...(goneAfter.get(key) ?? [])])];
};

/**
 * The rows of the card: one for each status it is given, and one for each status it showed before and is no
 * longer given, so that a status that loses its items, or drops out of the list, closes rather than vanishes.
 *
 * The memory is written while rendering. Rendering the same statuses again gives the same rows, so a render that
 * React repeats or discards leaves the memory as a render that it keeps would.
 */
const useStatusRows = (givenStatuses: readonly StatusCardStatus[], counted: number) => {
  const memory = useRef<StatusRowMemory>({ keys: [], lastShown: new Map() }).current;
  const givenKeys = keysOf(givenStatuses);
  const given = new Map(givenKeys.map((key, index) => [key, givenStatuses[index]]));

  const rows = mergeKeys(memory.keys, givenKeys).flatMap((key): StatusRow[] => {
    const status = given.get(key);

    if (status && isShown(status)) {
      const row = { key, status, percent: percentOf(status.count, counted), shown: true };

      memory.lastShown.set(key, row);

      return [row];
    }

    const last = memory.lastShown.get(key);

    if (last) {
      return [{ ...last, shown: false }];
    }

    return status ? [{ key, status: { ...status, count: 0 }, percent: percentOf(0, counted), shown: false }] : [];
  });

  memory.keys = rows.map((row) => row.key);

  return { rows, memory };
};

interface CollapsibleProps {
  open: boolean;
  children: ReactNode;
}

/**
 * Opens and closes its content by its height. Closed, it is not part of the card: hidden from screen readers, with
 * nothing in it that can be focused.
 */
const Collapsible = ({ open, children }: CollapsibleProps) => (
  <span
    className="StatusCard-collapsible"
    data-collapsed={!open || undefined}
    aria-hidden={!open || undefined}
    inert={!open || undefined}
  >
    {children}
  </span>
);

/**
 * The number of items of one kind and their statuses: the total, the share that is healthy, the number that
 * fail, a bar of the statuses and a legend with each status, its count and its share. The colors of the card
 * are the colors of the active theme, and of the statuses the colors they are given.
 *
 * A change of the statuses is animated: a row of the legend opens when its status gets items and closes when it
 * loses them or drops out of the list, the bar segments grow and shrink, and the legend and the empty text take
 * turns the same way, so that the card changes its height smoothly.
 */
export const StatusCard = ({
  title,
  total: givenTotal,
  statuses: givenStatuses,
  emptyText = "None",
  noStatusText = "No status reported",
  onClick,
  className,
  "data-testid": testId,
}: StatusCardProps) => {
  const statuses = givenStatuses.filter(isShown);
  const counted = sumOf(statuses);
  const total = givenTotal ?? counted;
  const healthy = sumOf(statuses.filter((status) => status.tone === "healthy"));
  const failing = sumOf(statuses.filter((status) => status.tone === "failing"));
  const { rows, memory } = useStatusRows(givenStatuses, counted);
  const hasStatuses = statuses.length > 0;

  if (!hasStatuses) {
    memory.emptyText = total > 0 ? noStatusText : emptyText;
  }

  const content = (
    <>
      <span className="StatusCard-header">
        <span className="StatusCard-title">{title}</span>
        {onClick && <Icon material="chevron_right" smallest className="StatusCard-chevron" />}
      </span>

      <span className="StatusCard-summary">
        <span className="StatusCard-total" data-testid={partTestId(testId, "total")}>
          {total}
        </span>
        {counted > 0 && <span className="StatusCard-health">{`${percentOf(healthy, counted)} healthy`}</span>}
        {failing > 0 && (
          <span className="StatusCard-failing" data-testid={partTestId(testId, "failing")}>{`${failing} failing`}</span>
        )}
      </span>

      <span className="StatusCard-bar" aria-hidden="true">
        {rows.map((row) => (
          <span
            key={row.key}
            className="StatusCard-segment"
            data-collapsed={!row.shown || undefined}
            data-healthy={row.status.tone === "healthy" || undefined}
            style={{ flexGrow: row.shown ? row.status.count : 0, backgroundColor: row.status.color }}
          />
        ))}
      </span>

      <span className="StatusCard-details">
        <Collapsible open={hasStatuses}>
          <span className="StatusCard-legend">
            {rows.map((row) => (
              <Collapsible key={row.key} open={row.shown}>
                <span
                  className="StatusCard-legendRow"
                  data-failing={(row.shown && row.status.tone === "failing") || undefined}
                  data-testid={row.shown ? partTestId(testId, `status-${toTestId(row.status.label)}`) : undefined}
                >
                  <span className="StatusCard-dot" style={{ backgroundColor: row.status.color }} aria-hidden="true" />
                  <span className="StatusCard-label">{row.status.label}</span>
                  <span className="StatusCard-count">{row.status.count}</span>
                  <span className="StatusCard-percent">{row.percent}</span>
                </span>
              </Collapsible>
            ))}
          </span>
        </Collapsible>
        <Collapsible open={!hasStatuses}>
          <span className="StatusCard-empty" data-testid={hasStatuses ? undefined : partTestId(testId, "empty")}>
            {memory.emptyText}
          </span>
        </Collapsible>
      </span>
    </>
  );

  return (
    <Card
      className={cssNames("StatusCard", className)}
      onClick={onClick}
      aria-label={onClick ? undefined : title}
      data-testid={testId}
    >
      {content}
    </Card>
  );
};
