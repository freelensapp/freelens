/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { Select } from "../select";
import selectedMetricsTimeRangeInjectable, {
  timeRangeOptions,
} from "./overview/selected-metrics-time-range.injectable";

import type { SingleValue } from "react-select";

import type { SelectOption } from "../select";
import type { SelectedMetricsTimeRange } from "./overview/selected-metrics-time-range.injectable";

interface Dependencies {
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

interface TimeRangeOption {
  value: number | "custom";
  label: string;
}

const NonInjectedMetricsTimeRangeSelector = observer(({ selectedMetricsTimeRange }: Dependencies) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Convert time range options to select options
  const selectOptions: TimeRangeOption[] = [
    ...timeRangeOptions.map((opt) => ({
      value: opt.duration,
      label: opt.label,
    })),
    {
      value: "custom" as const,
      label: "Custom",
    },
  ];

  const isCustom = selectedMetricsTimeRange.isCustom.get();
  const displayLabel = selectedMetricsTimeRange.displayLabel.get();

  // Find current selected option - return just the value, not the full option
  const currentValue: number | "custom" | undefined = isCustom
    ? "custom"
    : (selectOptions.find((opt) => {
        const timeRange = selectedMetricsTimeRange.value.get();

        return opt.value === timeRange.duration;
      })?.value ?? selectOptions[0]?.value);

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
    <div
      className="MetricsTimeRangeSelector"
      style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px", minWidth: "120px" }}
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
      <span style={{ fontSize: "12px", color: "var(--textColorSecondary)", whiteSpace: "nowrap" }}>{displayLabel}</span>
      {showCustomPicker && (
        <CustomTimeRangePicker
          onApply={handleCustomRangeApply}
          onCancel={() => setShowCustomPicker(false)}
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
      )}
    </div>
  );
});

interface CustomTimeRangePickerProps {
  onApply: (start: Date, end: Date) => void;
  onCancel: () => void;
  initialStart: Date;
  initialEnd: Date;
}

const CustomTimeRangePicker: React.FC<CustomTimeRangePickerProps> = observer(
  ({ onApply, onCancel, initialStart, initialEnd }) => {
    const [startDate, setStartDate] = useState(initialStart);
    const [endDate, setEndDate] = useState(initialEnd);

    const handleApply = () => {
      if (startDate >= endDate) {
        alert("Start date must be before end date");

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
      <div
        className="CustomTimeRangePicker"
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          zIndex: 1000,
          backgroundColor: "var(--contentColor)",
          border: "1px solid var(--borderColor)",
          borderRadius: "var(--border-radius)",
          padding: "var(--padding)",
          marginTop: "4px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          minWidth: "300px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "12px" }}>Start:</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(startDate)}
            onChange={(e) => setStartDate(parseDateTimeLocal(e.target.value))}
            style={{
              width: "100%",
              padding: "4px 8px",
              border: "1px solid var(--borderColor)",
              borderRadius: "var(--border-radius)",
              backgroundColor: "var(--contentColor)",
              color: "var(--textColorPrimary)",
            }}
          />
        </div>
        <div style={{ marginBottom: "8px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "12px" }}>End:</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(endDate)}
            onChange={(e) => setEndDate(parseDateTimeLocal(e.target.value))}
            style={{
              width: "100%",
              padding: "4px 8px",
              border: "1px solid var(--borderColor)",
              borderRadius: "var(--border-radius)",
              backgroundColor: "var(--contentColor)",
              color: "var(--textColorPrimary)",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "4px 12px",
              border: "1px solid var(--borderColor)",
              borderRadius: "var(--border-radius)",
              backgroundColor: "var(--contentColor)",
              color: "var(--textColorPrimary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: "4px 12px",
              border: "none",
              borderRadius: "var(--border-radius)",
              backgroundColor: "var(--colorSuccess)",
              color: "white",
              cursor: "pointer",
            }}
          >
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
  }),
});
