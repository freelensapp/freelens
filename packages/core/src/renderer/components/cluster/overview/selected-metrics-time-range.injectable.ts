/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed } from "mobx";
import { getSecondsFromUnixEpoch } from "../../../../common/utils/date/get-current-date-time";
import metricsTimeRangeStorageInjectable from "./metrics-time-range-storage.injectable";

export type SelectedMetricsTimeRange = ReturnType<(typeof selectedMetricsTimeRangeInjectable)["instantiate"]>;

/**
 * Predefined time range options
 */
export const timeRangeOptions = [
  { label: "5m", duration: 300 },
  { label: "30m", duration: 1800 },
  { label: "1h", duration: 3600 },
  { label: "2h", duration: 7200 },
  { label: "4h", duration: 14400 },
  { label: "24h", duration: 86400 },
] as const;

const selectedMetricsTimeRangeInjectable = getInjectable({
  id: "selected-metrics-time-range",
  instantiate: (di) => {
    const storage = di.inject(metricsTimeRangeStorageInjectable);

    /**
     * Get the current time range configuration
     */
    const value = computed(() => storage.get());

    /**
     * Get start and end timestamps based on current selection
     */
    const timestamps = computed(() => {
      const timeRange = value.get();
      const now = getSecondsFromUnixEpoch();

      if (timeRange.duration !== null) {
        // Predefined duration
        return {
          start: now - timeRange.duration,
          end: now,
          range: timeRange.duration,
        };
      } else {
        // Custom time range
        const start = timeRange.customStart ?? now - 3600;
        const end = timeRange.customEnd ?? now;

        return {
          start,
          end,
          range: end - start,
        };
      }
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
     * Get the display label in compact format (e.g., "now-1h" or date range)
     */
    const displayLabel = computed(() => {
      const timeRange = value.get();

      if (timeRange.duration !== null) {
        const option = timeRangeOptions.find((opt) => opt.duration === timeRange.duration);

        return option ? `now-${option.label}` : "Custom";
      } else {
        // Custom time range - format as date range
        if (timeRange.customStart && timeRange.customEnd) {
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
        }

        return "Custom";
      }
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
        storage.merge({
          duration: 3600,
          customStart: undefined,
          customEnd: undefined,
        });
      }),
    };
  },
});

export default selectedMetricsTimeRangeInjectable;
