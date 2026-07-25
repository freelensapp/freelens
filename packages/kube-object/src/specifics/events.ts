/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatDuration } from "@freelensapp/utilities";
import { KubeObject } from "../kube-object";

import type { KubeJsonApiData, KubeObjectMetadata, KubeObjectScope, ObjectReference } from "../api-types";

export interface EventSeries {
  count?: number;
  lastObservedTime?: string;
}

export interface EventSource {
  component?: string;
  host?: string;
}

export interface KubeEventData extends KubeJsonApiData<KubeObjectMetadata<KubeObjectScope.Namespace>, void, void> {
  action?: string;
  count?: number;
  eventTime?: string;
  firstTimestamp?: string;
  involvedObject: Required<ObjectReference>;
  lastTimestamp?: string;
  message?: string;
  reason?: string;
  related?: ObjectReference;
  reportingComponent?: string;
  reportingInstance?: string;
  series?: EventSeries;
  source?: EventSource;
  type?: string;
}

export class KubeEvent extends KubeObject<KubeObjectMetadata<KubeObjectScope.Namespace>, void, void> {
  static kind = "Event";

  static namespaced = true;

  static apiBase = "/api/v1/events";

  action?: string;

  count?: number;

  eventTime?: string;

  firstTimestamp?: string;

  involvedObject: Required<ObjectReference>;

  lastTimestamp?: string;

  message?: string;

  reason?: string;

  related?: ObjectReference;

  reportingComponent?: string;

  reportingInstance?: string;

  series?: EventSeries;

  source?: EventSource;

  /**
   * Current supported values are:
   * - "Normal"
   * - "Warning"
   */
  type?: string;

  constructor({
    action,
    count,
    eventTime,
    firstTimestamp,
    involvedObject,
    lastTimestamp,
    message,
    reason,
    related,
    reportingComponent,
    reportingInstance,
    series,
    source,
    type,
    ...rest
  }: KubeEventData) {
    super(rest);
    this.action = action;
    this.count = count;
    this.eventTime = eventTime;
    this.firstTimestamp = firstTimestamp;
    this.involvedObject = involvedObject;
    this.lastTimestamp = lastTimestamp;
    this.message = message;
    this.reason = reason;
    this.related = related;
    this.reportingComponent = reportingComponent;
    this.reportingInstance = reportingInstance;
    this.series = series;
    this.source = source;
    this.type = type;
  }

  isWarning() {
    return this.type === "Warning";
  }

  getSource() {
    if (this.source?.component) {
      const { component, host = "" } = this.source;

      return `${component} ${host}`;
    }

    // The events.k8s.io/v1 API leaves the legacy `source` empty and reports the
    // emitter through `reportingComponent` / `reportingInstance` instead.
    if (this.reportingComponent) {
      return `${this.reportingComponent} ${this.reportingInstance ?? ""}`.trimEnd();
    }

    return "<unknown>";
  }

  /**
   * The repeat count of the event. The events.k8s.io/v1 API leaves the legacy
   * `count` empty and reports repeats through `series.count` instead.
   */
  getCount() {
    return this.count ?? this.series?.count ?? 0;
  }

  /**
   * @deprecated This function is not reactive to changing of time. If rendering use `<ReactiveDuration />` instead
   */
  getFirstSeenTime() {
    const diff = this.firstTimestamp ? Date.now() - new Date(this.firstTimestamp).getTime() : 0;

    return formatDuration(diff, true);
  }

  /**
   * @deprecated This function is not reactive to changing of time. If rendering use `<ReactiveDuration />` instead
   */
  getLastSeenTime() {
    const diff = this.lastTimestamp ? Date.now() - new Date(this.lastTimestamp).getTime() : 0;

    return formatDuration(diff, true);
  }
}
