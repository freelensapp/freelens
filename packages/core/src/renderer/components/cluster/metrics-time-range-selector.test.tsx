/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { act, fireEvent, screen } from "@testing-library/react";
import { computed, observable } from "mobx";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { MetricsTimeRangeSelector } from "./metrics-time-range-selector";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";

vi.mock("../select", () => ({
  Select: ({ id, onChange, options, value }: any) => (
    <select
      data-testid={id}
      value={value === null ? "" : String(value)}
      onChange={(event) => {
        const option = options.find((candidate: any) => String(candidate.value) === event.target.value) ?? null;

        onChange(option);
      }}
    >
      <option value="">Select time range...</option>
      {options.map((option: any) => (
        <option key={String(option.value)} value={String(option.value)}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

describe("MetricsTimeRangeSelector", () => {
  it("resyncs custom inputs when the selected range changes while the dialog is open", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    const selectedTimeRange = observable.box<{
      duration: number | null;
      customStart?: number;
      customEnd?: number;
    }>({ duration: 3600, customStart: undefined, customEnd: undefined }, { deep: false });
    const showErrorNotification = vi.fn();
    const expectedStart = Math.floor(new Date(2024, 0, 1, 10, 15).getTime() / 1000);
    const expectedEnd = Math.floor(new Date(2024, 0, 1, 11, 45).getTime() / 1000);

    di.override(showErrorNotificationInjectable, () => showErrorNotification);
    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: computed(() => selectedTimeRange.get()),
          timestamps: computed(() => {
            const value = selectedTimeRange.get();

            return {
              start: value.customStart ?? 0,
              end: value.customEnd ?? 0,
              range: (value.customEnd ?? 0) - (value.customStart ?? 0),
            };
          }),
          label: computed(() => (selectedTimeRange.get().duration === null ? "Custom" : "1 hour")),
          displayLabel: computed(() => ""),
          isCustom: computed(() => selectedTimeRange.get().duration === null),
          setDuration: vi.fn(),
          setCustomRange: vi.fn(),
          reset: vi.fn(),
        }) as never,
    );

    render(<MetricsTimeRangeSelector />);

    fireEvent.change(screen.getByTestId("metrics-time-range-select"), {
      target: { value: "custom" },
    });

    act(() => {
      selectedTimeRange.set({
        duration: null,
        customStart: expectedStart,
        customEnd: expectedEnd,
      });
    });

    expect(screen.getByDisplayValue("2024-01-01T10:15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-01-01T11:45")).toBeInTheDocument();
    expect(showErrorNotification).not.toHaveBeenCalled();
  });
});
