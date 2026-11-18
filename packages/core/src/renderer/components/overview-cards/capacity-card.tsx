/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./capacity-card.scss";

import { cssNames } from "@freelensapp/utilities";

/** The names of the values of a capacity card, in its legend and its bar. */
export interface CapacityCardLabels {
  usage: string;
  requests: string;
  limits: string;
  allocatable: string;
  capacity: string;
}

export interface CapacityCardProps {
  /** The name of the resource, the heading of the card: "CPU", "Memory". */
  title: string;
  /** What is in use, the headline number of the card. */
  usage: number;
  /** What the consumers ask for. Without it the card has no requests. */
  requests?: number;
  /** What the consumers may use at most. Without it the card has no limits. */
  limits?: number;
  /** What can be used: the scale of the percentages and the marker on the bar. */
  allocatable: number;
  /** All there is, listed only when it differs from what is allocatable. */
  capacity?: number;
  /**
   * The unit the default `format` appends to a value: "cores", "pods". Ignored when `format` is given.
   */
  unit?: string;
  /** A value with its unit, for the legend and the bar: "4.00 cores", "7.7GiB". */
  format?: (value: number) => string;
  /** The usage as the headline number: "0.79". Defaults to `format` when that is given, else to the bare number. */
  formatHeadline?: (value: number) => string;
  /** The names of the values. Each one not given keeps its English default. */
  labels?: Partial<CapacityCardLabels>;
  className?: string;
  /** The test id of the card. Its parts get test ids of their own that start with it. */
  "data-testid"?: string;
}

const defaultLabels: CapacityCardLabels = {
  usage: "Usage",
  requests: "Requests",
  limits: "Limits",
  allocatable: "Allocatable",
  capacity: "Capacity",
};

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const formatNumber = (value: number) => String(Math.round(value * 100) / 100);

const percentOf = (value: number, total: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "—");

const widthOf = (value: number, scale: number) => `${scale > 0 ? Math.min(100, (value / scale) * 100) : 0}%`;

const partTestId = (testId: string | undefined, part: string) => (testId ? `${testId}-${part}` : undefined);

interface LegendRowProps {
  swatch: keyof CapacityCardLabels;
  label: string;
  value: string;
  percent?: string;
  warning?: boolean;
}

const LegendRow = ({ swatch, label, value, percent, warning }: LegendRowProps) => (
  <div className="CapacityCard-legendRow" data-warning={warning || undefined}>
    <span className="CapacityCard-swatch" data-swatch={swatch} aria-hidden="true" />
    <dt className="CapacityCard-legendLabel" title={label}>
      {label}
    </dt>
    <dd className="CapacityCard-legendValues">
      <span className="CapacityCard-legendValue">{value}</span>
      <span className="CapacityCard-legendPercent">{percent}</span>
    </dd>
  </div>
);

/**
 * The usage of one resource on the scale of what is allocatable: the usage as a headline number and as a
 * percentage, a bar with the requests, the usage and the part of the limits beyond what is allocatable, and
 * a legend of the values. The card warns when the limits overcommit what is allocatable. Its colors are the
 * colors of the active theme.
 */
export const CapacityCard = ({
  title,
  usage,
  requests,
  limits,
  allocatable,
  capacity,
  unit,
  format,
  formatHeadline,
  labels: customLabels,
  className,
  "data-testid": testId,
}: CapacityCardProps) => {
  const labels = { ...defaultLabels, ...customLabels };
  const formatValue = format ?? ((value: number) => (unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)));
  const formatUsage = formatHeadline ?? format ?? formatNumber;
  const overflow = isNumber(limits) && limits > allocatable ? limits - allocatable : 0;
  const isOvercommitted = overflow > 0;
  const overcommitRatio = isNumber(limits) && allocatable > 0 ? limits / allocatable : 0;
  const scale = Math.max(allocatable, usage, requests ?? 0, limits ?? 0);
  const allocatableWidth = widthOf(allocatable, scale);
  const isMarkerAtEnd = scale > 0 && allocatable / scale > 0.85;
  // Capacity only earns a row when it differs from what is allocatable.
  const extraCapacity = isNumber(capacity) && Math.abs(capacity - allocatable) > allocatable * 0.005 ? capacity : null;

  return (
    <section className={cssNames("CapacityCard", className)} aria-label={title} data-testid={testId}>
      <header className="CapacityCard-header">
        <h3 className="CapacityCard-title">{title}</h3>
        <span
          className="CapacityCard-percent"
          title={`${labels.usage} / ${labels.allocatable}`}
          data-testid={partTestId(testId, "percent")}
        >
          {percentOf(usage, allocatable)}
        </span>
      </header>

      <div className="CapacityCard-summary">
        <span className="CapacityCard-value">{formatUsage(usage)}</span>
        <span className="CapacityCard-of">{`/ ${formatValue(allocatable)}`}</span>
      </div>

      <div
        className="CapacityCard-bar"
        role="img"
        aria-label={`${title}: ${labels.usage} ${formatValue(usage)}, ${labels.allocatable} ${formatValue(allocatable)}`}
      >
        <div className="CapacityCard-track" style={{ width: allocatableWidth }} />
        {isOvercommitted && (
          <div
            className="CapacityCard-overflow"
            style={{ left: allocatableWidth, width: widthOf(overflow, scale) }}
            data-testid={partTestId(testId, "overflow")}
          />
        )}
        {isNumber(requests) && <div className="CapacityCard-requests" style={{ width: widthOf(requests, scale) }} />}
        <div className="CapacityCard-usage" style={{ width: widthOf(usage, scale) }} />
        <div className="CapacityCard-marker" style={{ left: allocatableWidth }} />
        <span
          className="CapacityCard-markerLabel"
          style={{ left: allocatableWidth, transform: isMarkerAtEnd ? "translateX(-100%)" : "translateX(-50%)" }}
          aria-hidden="true"
        >
          {labels.allocatable}
        </span>
      </div>

      {isOvercommitted && (
        <div className="CapacityCard-overcommit" data-testid={partTestId(testId, "overcommit")}>
          {`${labels.limits} ${overcommitRatio.toFixed(1)}× ${labels.allocatable}`}
        </div>
      )}

      <dl className="CapacityCard-legend">
        <LegendRow
          swatch="usage"
          label={labels.usage}
          value={formatValue(usage)}
          percent={percentOf(usage, allocatable)}
        />
        {isNumber(requests) && (
          <LegendRow
            swatch="requests"
            label={labels.requests}
            value={formatValue(requests)}
            percent={percentOf(requests, allocatable)}
          />
        )}
        {isNumber(limits) && (
          <LegendRow
            swatch="limits"
            label={labels.limits}
            value={formatValue(limits)}
            percent={percentOf(limits, allocatable)}
            warning={isOvercommitted}
          />
        )}
        <LegendRow swatch="allocatable" label={labels.allocatable} value={formatValue(allocatable)} />
        {extraCapacity !== null && (
          <LegendRow swatch="capacity" label={labels.capacity} value={formatValue(extraCapacity)} />
        )}
      </dl>
    </section>
  );
};
