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
import { formatMetricsDateTimeLocal, validateCustomMetricsTimeRange } from "./metrics-time-range";
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

export interface MetricsTimeRangeSelectorProps {
  displayMode?: "compact" | "expanded";
}

interface TimeRangeOption {
  value: number | "custom";
  label: string;
}

const NonInjectedMetricsTimeRangeSelector = observer(
  ({
    selectedMetricsTimeRange,
    showErrorNotification,
    displayMode = "compact",
  }: Dependencies & MetricsTimeRangeSelectorProps) => {
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

    const handleCustomRangeApply = (start: number, end: number) => {
      selectedMetricsTimeRange.setCustomRange(start, end);
      setShowCustomPicker(false);
    };

    return (
      <div
        className={`${styles.container} ${displayMode === "expanded" ? styles.containerExpanded : styles.containerCompact}`}
      >
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
        {isCustom && displayLabel && (
          <span
            className={`${styles.displayLabel} ${displayMode === "expanded" ? styles.displayLabelExpanded : styles.displayLabelCompact}`}
            title={displayLabel}
          >
            {displayLabel}
          </span>
        )}
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
  onApply: (start: number, end: number) => void;
  onCancel: () => void;
  showErrorNotification: ShowNotification;
  initialStart: Date;
  initialEnd: Date;
}

const CustomTimeRangePicker: React.FC<CustomTimeRangePickerProps> = observer(
  ({ onApply, onCancel, showErrorNotification, initialStart, initialEnd }) => {
    const [startValue, setStartValue] = useState(() => formatMetricsDateTimeLocal(initialStart));
    const [endValue, setEndValue] = useState(() => formatMetricsDateTimeLocal(initialEnd));

    const handleApply = () => {
      const result = validateCustomMetricsTimeRange({
        start: startValue,
        end: endValue,
        now: new Date(),
      });

      if ("error" in result) {
        showErrorNotification(result.error);
        return;
      }

      onApply(result.value.start, result.value.end);
    };

    return (
      <div className={styles.pickerContent}>
        <h5 className={styles.header}>Custom Time Range</h5>
        <div className={styles.inputGroup}>
          <label>Start:</label>
          <input type="datetime-local" value={startValue} onChange={(e) => setStartValue(e.target.value)} autoFocus />
        </div>
        <div className={styles.inputGroup}>
          <label>End:</label>
          <input type="datetime-local" value={endValue} onChange={(e) => setEndValue(e.target.value)} />
        </div>
        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={`${styles.button} ${styles.cancelButton}`}
            aria-label="Cancel custom time range selection"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className={`${styles.button} ${styles.applyButton}`}
            aria-label="Apply custom time range"
          >
            Apply
          </button>
        </div>
      </div>
    );
  },
);

export const MetricsTimeRangeSelector = withInjectables<Dependencies, MetricsTimeRangeSelectorProps>(
  NonInjectedMetricsTimeRangeSelector,
  {
    getProps: (di, props) => ({
      ...props,
      selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
    }),
  },
);
