/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useMemo, useState } from "react";
import { Dialog } from "../dialog";
import { Select } from "../select";
import styles from "./metrics-time-range-selector.module.scss";
import selectedMetricsTimeRangeInjectable, {
  timeRangeOptions,
} from "./overview/selected-metrics-time-range.injectable";

import type { ShowNotification } from "@freelensapp/notifications";

import type { SingleValue } from "react-select";

import type { SelectOption } from "../select";
import type { SelectedMetricsTimeRange } from "./overview/selected-metrics-time-range.injectable";

interface Dependencies {
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
  showErrorNotification: ShowNotification;
}

interface TimeRangeOption {
  value: number | "custom";
  label: string;
}

const NonInjectedMetricsTimeRangeSelector = observer(
  ({ selectedMetricsTimeRange, showErrorNotification }: Dependencies) => {
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const selectOptions: TimeRangeOption[] = useMemo(
      () => [
        ...timeRangeOptions.map((opt) => ({
          value: opt.duration,
          label: opt.label,
        })),
        {
          value: "custom" as const,
          label: "Custom",
        },
      ],
      [],
    );

    const isCustom = selectedMetricsTimeRange.isCustom.get();
    const displayLabel = selectedMetricsTimeRange.displayLabel.get();
    const timeRange = selectedMetricsTimeRange.value.get();

    const currentValue: number | "custom" | null = useMemo(
      () => (isCustom ? "custom" : timeRange.duration),
      [isCustom, timeRange.duration],
    );

    const handleChange = (option: SingleValue<SelectOption<number | "custom">>) => {
      if (!option) return;

      if (option.value === "custom") {
        setShowCustomPicker(true);
      } else {
        selectedMetricsTimeRange.setDuration(option.value);
        setShowCustomPicker(false);
      }
    };

    const handleCustomRangeApply = (start: Date, end: Date) => {
      const startSeconds = Math.floor(start.getTime() / 1000);
      const endSeconds = Math.floor(end.getTime() / 1000);

      selectedMetricsTimeRange.setCustomRange(startSeconds, endSeconds);
      setShowCustomPicker(false);
    };

    return (
      <div className={styles.container}>
        <Select<number | "custom", SelectOption<number | "custom">, false>
          id="metrics-time-range-select"
          options={selectOptions}
          value={currentValue}
          onChange={handleChange}
          menuPlacement="auto"
          themeName="lens"
          isSearchable={false}
          placeholder="Select time range..."
        />
        <span className={styles.displayLabel}>{displayLabel}</span>
        <Dialog isOpen={showCustomPicker} close={() => setShowCustomPicker(false)}>
          <CustomTimeRangePicker
            onApply={handleCustomRangeApply}
            onCancel={() => setShowCustomPicker(false)}
            showErrorNotification={showErrorNotification}
            initialStart={
              isCustom && selectedMetricsTimeRange.value.get().customStart
                ? new Date(selectedMetricsTimeRange.value.get().customStart! * 1000)
                : new Date(Date.now() - 3600000)
            }
            initialEnd={
              isCustom && selectedMetricsTimeRange.value.get().customEnd
                ? new Date(selectedMetricsTimeRange.value.get().customEnd! * 1000)
                : new Date()
            }
          />
        </Dialog>
      </div>
    );
  },
);

interface CustomTimeRangePickerProps {
  onApply: (start: Date, end: Date) => void;
  onCancel: () => void;
  showErrorNotification: ShowNotification;
  initialStart: Date;
  initialEnd: Date;
}

const CustomTimeRangePicker: React.FC<CustomTimeRangePickerProps> = observer(
  ({ onApply, onCancel, showErrorNotification, initialStart, initialEnd }) => {
    const [startDate, setStartDate] = useState(initialStart);
    const [endDate, setEndDate] = useState(initialEnd);

    const handleApply = () => {
      if (startDate >= endDate) {
        showErrorNotification("Start date must be before end date");
        return;
      }
      const now = new Date();
      if (endDate > now) {
        showErrorNotification("End date cannot be in the future");
        return;
      }

      onApply(startDate, endDate);
    };

    const formatDateTimeLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const parseDateTimeLocal = (value: string) => {
      return new Date(value);
    };

    return (
      <div className={styles.pickerContent}>
        <div className={styles.inputGroup}>
          <label>Start:</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(startDate)}
            onChange={(e) => setStartDate(parseDateTimeLocal(e.target.value))}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>End:</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(endDate)}
            onChange={(e) => setEndDate(parseDateTimeLocal(e.target.value))}
          />
        </div>
        <div className={styles.actions}>
          <button onClick={onCancel} className={`${styles.button} ${styles.cancelButton}`}>
            Cancel
          </button>
          <button onClick={handleApply} className={`${styles.button} ${styles.applyButton}`}>
            Apply
          </button>
        </div>
      </div>
    );
  },
);

export const MetricsTimeRangeSelector = withInjectables<Dependencies>(NonInjectedMetricsTimeRangeSelector, {
  getProps: (di) => ({
    selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
    showErrorNotification: di.inject(showErrorNotificationInjectable),
  }),
});
