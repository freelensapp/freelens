/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// A minimal Chart.js date adapter built on native `Date` / `Intl`, replacing
// `chartjs-adapter-moment`. Chart.js "time" scales require a date adapter for
// tick generation (add/diff/startOf/endOf) even when parsing and label
// formatting are overridden by the chart itself. All calculations use local
// time, matching moment's previous default behavior.

import { _adapters } from "chart.js";

import type { TimeUnit } from "chart.js";

const FORMATS = {
  datetime: "datetime",
  millisecond: "millisecond",
  second: "second",
  minute: "minute",
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

const INTL_FORMAT_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: "medium", timeStyle: "medium" },
  millisecond: { hour: "numeric", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 },
  second: { hour: "numeric", minute: "2-digit", second: "2-digit" },
  minute: { hour: "numeric", minute: "2-digit" },
  hour: { hour: "numeric" },
  day: { month: "short", day: "numeric" },
  week: { month: "short", day: "numeric" },
  month: { month: "short", year: "numeric" },
  quarter: { month: "short", year: "numeric" },
  year: { year: "numeric" },
};

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value as number | string);
}

_adapters._date.override({
  formats() {
    return FORMATS;
  },

  parse(value) {
    if (value === null || value === undefined) {
      return null;
    }

    const time = value instanceof Date ? value.getTime() : toDate(value).getTime();

    return Number.isNaN(time) ? null : time;
  },

  format(time, format) {
    // Chart.js passes "x" as the display format for this app's charts, which
    // render millisecond timestamps directly via their own tick callbacks.
    if (format === "x") {
      return String(Math.round(time));
    }

    const options = INTL_FORMAT_OPTIONS[format];

    if (options) {
      return new Intl.DateTimeFormat(undefined, options).format(new Date(time));
    }

    return new Date(time).toLocaleString();
  },

  add(time, amount, unit: TimeUnit) {
    const date = new Date(time);

    switch (unit) {
      case "millisecond":
        date.setMilliseconds(date.getMilliseconds() + amount);
        break;
      case "second":
        date.setSeconds(date.getSeconds() + amount);
        break;
      case "minute":
        date.setMinutes(date.getMinutes() + amount);
        break;
      case "hour":
        date.setHours(date.getHours() + amount);
        break;
      case "day":
        date.setDate(date.getDate() + amount);
        break;
      case "week":
        date.setDate(date.getDate() + amount * 7);
        break;
      case "month":
        date.setMonth(date.getMonth() + amount);
        break;
      case "quarter":
        date.setMonth(date.getMonth() + amount * 3);
        break;
      case "year":
        date.setFullYear(date.getFullYear() + amount);
        break;
    }

    return date.getTime();
  },

  diff(max, min, unit: TimeUnit) {
    const a = new Date(max);
    const b = new Date(min);
    const ms = max - min;
    const months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

    switch (unit) {
      case "millisecond":
        return ms;
      case "second":
        return Math.trunc(ms / 1000);
      case "minute":
        return Math.trunc(ms / 60_000);
      case "hour":
        return Math.trunc(ms / 3_600_000);
      case "day":
        return Math.trunc(ms / 86_400_000);
      case "week":
        return Math.trunc(ms / (7 * 86_400_000));
      case "month":
        return months;
      case "quarter":
        return Math.trunc(months / 3);
      case "year":
        return a.getFullYear() - b.getFullYear();
      default:
        return ms;
    }
  },

  startOf(time, unit: TimeUnit | "isoWeek", weekday) {
    const date = new Date(time);

    switch (unit) {
      case "second":
        date.setMilliseconds(0);
        break;
      case "minute":
        date.setSeconds(0, 0);
        break;
      case "hour":
        date.setMinutes(0, 0, 0);
        break;
      case "day":
        date.setHours(0, 0, 0, 0);
        break;
      case "week":
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - date.getDay());
        break;
      case "isoWeek": {
        const wd = typeof weekday === "number" ? weekday : 0;
        const target = Math.trunc(Math.min(Math.max(0, wd), 6));
        // Map JS day (0=Sunday) to ISO day (1=Monday..7=Sunday).
        const isoDay = date.getDay() === 0 ? 7 : date.getDay();

        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - isoDay + (target === 0 ? 7 : target));
        break;
      }
      case "month":
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        break;
      case "quarter":
        date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
        date.setHours(0, 0, 0, 0);
        break;
      case "year":
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
        break;
    }

    return date.getTime();
  },

  endOf(time, unit: TimeUnit | "isoWeek") {
    const date = new Date(time);

    switch (unit) {
      case "second":
        date.setMilliseconds(999);
        break;
      case "minute":
        date.setSeconds(59, 999);
        break;
      case "hour":
        date.setMinutes(59, 59, 999);
        break;
      case "day":
        date.setHours(23, 59, 59, 999);
        break;
      case "week":
        date.setHours(23, 59, 59, 999);
        date.setDate(date.getDate() + (6 - date.getDay()));
        break;
      case "isoWeek": {
        const isoDay = date.getDay() === 0 ? 7 : date.getDay();

        date.setHours(23, 59, 59, 999);
        date.setDate(date.getDate() + (7 - isoDay));
        break;
      }
      case "month":
        date.setMonth(date.getMonth() + 1, 0);
        date.setHours(23, 59, 59, 999);
        break;
      case "quarter":
        date.setMonth(Math.floor(date.getMonth() / 3) * 3 + 3, 0);
        date.setHours(23, 59, 59, 999);
        break;
      case "year":
        date.setMonth(11, 31);
        date.setHours(23, 59, 59, 999);
        break;
    }

    return date.getTime();
  },
});
