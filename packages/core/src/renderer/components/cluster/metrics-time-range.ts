/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const dateTimeLocalPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function parseDateTimeLocalToUnixSeconds(value: string): number | undefined {
  const matches = dateTimeLocalPattern.exec(value);

  if (!matches) {
    return undefined;
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = matches;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const parsedDate = new Date(year, month - 1, day, hour, minute);

  if (!Number.isFinite(parsedDate.getTime())) {
    return undefined;
  }

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day ||
    parsedDate.getHours() !== hour ||
    parsedDate.getMinutes() !== minute
  ) {
    return undefined;
  }

  return Math.floor(parsedDate.getTime() / 1000);
}

export function formatMetricsDateTimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function validateCustomMetricsTimeRange({
  start,
  end,
  now,
}: {
  start: string;
  end: string;
  now: Date;
}): { error: string } | { value: { start: number; end: number } } {
  if (!start) {
    return { error: "Start date is required" };
  }

  if (!end) {
    return { error: "End date is required" };
  }

  const startSeconds = parseDateTimeLocalToUnixSeconds(start);

  if (startSeconds === undefined) {
    return { error: "Start date is invalid" };
  }

  const endSeconds = parseDateTimeLocalToUnixSeconds(end);

  if (endSeconds === undefined) {
    return { error: "End date is invalid" };
  }

  if (startSeconds >= endSeconds) {
    return { error: "Start date must be before end date" };
  }

  if (endSeconds > Math.floor(now.getTime() / 1000)) {
    return { error: "End date cannot be in the future" };
  }

  return {
    value: {
      start: startSeconds,
      end: endSeconds,
    },
  };
}
