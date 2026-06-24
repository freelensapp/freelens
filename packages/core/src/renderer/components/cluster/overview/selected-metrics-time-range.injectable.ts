/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed } from "mobx";
import { now } from "mobx-utils";
import { getSecondsFromUnixEpoch } from "../../../../common/utils/date/get-current-date-time";
import metricsTimeRangeStorageInjectable, { defaultMetricsTimeRange } from "./metrics-time-range-storage.injectable";

import type { MetricsTimeRange } from "./metrics-time-range-storage.injectable";

export type SelectedMetricsTimeRange = ReturnType<(typeof selectedMetricsTimeRangeInjectable)["instantiate"]>;

/**
 * Predefined time range options
 */
export const timeRangeOptions = [
  { label: "5 minutes", duration: 300 },
  { label: "30 minutes", duration: 1800 },
  { label: "1 hour", duration: 3600 },
  { label: "2 hours", duration: 7200 },
  { label: "4 hours", duration: 14400 },
  { label: "24 hours", duration: 86400 },
] as const;

const everyMinute = 60 * 1000;

const selectedMetricsTimeRangeInjectable = getInjectable({
  id: "selected-metrics-time-range",
  instantiate: (di) => {
    const storage = di.inject(metricsTimeRangeStorageInjectable);
    const normalizeTimeRange = action(
      (timeRange: { duration: number | null; customStart?: number; customEnd?: number }): MetricsTimeRange => {
        let normalizedTimeRange: MetricsTimeRange;

        if (timeRange.duration !== null) {
          normalizedTimeRange = {
            duration: timeRange.duration,
            customStart: undefined,
            customEnd: undefined,
          };
        } else if (timeRange.customStart != null && timeRange.customEnd != null) {
          normalizedTimeRange = {
            duration: null,
            customStart: timeRange.customStart,
            customEnd: timeRange.customEnd,
          };
        } else {
          normalizedTimeRange = defaultMetricsTimeRange;
        }

        if (
          timeRange.duration !== normalizedTimeRange.duration ||
          timeRange.customStart !== normalizedTimeRange.customStart ||
          timeRange.customEnd !== normalizedTimeRange.customEnd
        ) {
          storage.set(normalizedTimeRange);
        }

        return normalizedTimeRange;
      },
    );

    /**
     * Read-time recovery keeps persisted UI state consumable even though the
     * underlying storage layer still allows partial object merges.
     */
    const value = computed(() => normalizeTimeRange(storage.get()));

    /**
     * Get start and end timestamps based on current selection
     */
    const timestamps = computed(() => {
      const timeRange = value.get();

      if (timeRange.duration !== null) {
        now(everyMinute);
        const currentTime = getSecondsFromUnixEpoch();

        // Predefined duration
        return {
          start: currentTime - timeRange.duration,
          end: currentTime,
          range: timeRange.duration,
        };
      }

      return {
        start: timeRange.customStart,
        end: timeRange.customEnd,
        range: timeRange.customEnd - timeRange.customStart,
      };
    });

    /**
     * Get the label for the current selection
     */
    const label = computed(() => {
      const timeRange = value.get();

      if (timeRange.duration !== null) {
        const option = timeRangeOptions.find((opt) => opt.duration === timeRange.duration);

        return option?.label ?? "Custom";
      }

      return "Custom";
    });

    /**
     * Get the auxiliary display label shown next to the selector.
     * Only custom ranges return text; predefined ranges intentionally return an empty string.
     */
    const displayLabel = computed(() => {
      const timeRange = value.get();

      if (timeRange.duration !== null) {
        return "";
      }

      const startDate = new Date(timeRange.customStart * 1000);
      const endDate = new Date(timeRange.customEnd * 1000);
      const formatDate = (date: Date) => {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const y = date.getFullYear();
        const h = String(date.getHours()).padStart(2, "0");
        const min = String(date.getMinutes()).padStart(2, "0");

        return `${d}/${m}/${y} ${h}:${min}`;
      };

      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    });

    /**
     * Check if custom time range is active
     */
    const isCustom = computed(() => value.get().duration === null);

    return {
      value,
      timestamps,
      label,
      displayLabel,
      isCustom,

      /**
       * Set a predefined duration
       */
      setDuration: action((duration: number) => {
        storage.merge({
          duration,
          customStart: undefined,
          customEnd: undefined,
        });
      }),

      /**
       * Set a custom time range
       */
      setCustomRange: action((start: number, end: number) => {
        storage.merge({
          duration: null,
          customStart: start,
          customEnd: end,
        });
      }),

      /**
       * Reset to default (1 hour)
       */
      reset: action(() => {
        storage.merge(defaultMetricsTimeRange);
      }),
    };
  },
});

export default selectedMetricsTimeRangeInjectable;
