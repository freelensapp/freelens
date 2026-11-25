/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./status-card.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";

/**
 * How a status counts: `healthy` counts towards the share that is healthy, `failing` towards the number that
 * fail, and `neutral`, the default, towards neither.
 */
export type StatusCardTone = "healthy" | "neutral" | "failing";

export interface StatusCardStatus {
  /** The name of the status in the legend: "Running". */
  label: string;
  /** How many items have the status. A status without items is left out. */
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
 * The number of items of one kind and their statuses: the total, the share that is healthy, the number that
 * fail, a bar of the statuses and a legend with each status, its count and its share. The colors of the card
 * are the colors of the active theme, and of the statuses the colors they are given.
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
  const statuses = givenStatuses.filter((status) => Number.isFinite(status.count) && status.count > 0);
  const counted = sumOf(statuses);
  const total = givenTotal ?? counted;
  const healthy = sumOf(statuses.filter((status) => status.tone === "healthy"));
  const failing = sumOf(statuses.filter((status) => status.tone === "failing"));

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
        {statuses.map((status, index) => (
          <span
            key={`${index}-${status.label}`}
            className="StatusCard-segment"
            data-healthy={status.tone === "healthy" || undefined}
            style={{ flexGrow: status.count, backgroundColor: status.color }}
          />
        ))}
      </span>

      {statuses.length > 0 ? (
        <span className="StatusCard-legend">
          {statuses.map((status, index) => (
            <span
              key={`${index}-${status.label}`}
              className="StatusCard-legendRow"
              data-failing={status.tone === "failing" || undefined}
              data-testid={partTestId(testId, `status-${toTestId(status.label)}`)}
            >
              <span className="StatusCard-dot" style={{ backgroundColor: status.color }} aria-hidden="true" />
              <span className="StatusCard-label">{status.label}</span>
              <span className="StatusCard-count">{status.count}</span>
              <span className="StatusCard-percent">{percentOf(status.count, counted)}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className="StatusCard-empty" data-testid={partTestId(testId, "empty")}>
          {total > 0 ? noStatusText : emptyText}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cssNames("StatusCard", className)} onClick={onClick} data-testid={testId}>
        {content}
      </button>
    );
  }

  return (
    <section className={cssNames("StatusCard", className)} aria-label={title} data-testid={testId}>
      {content}
    </section>
  );
};
