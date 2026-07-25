/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Native `Date` / `Intl` based replacements for the previously used
// `moment` / `moment-timezone` helpers. The IANA timezone database used by
// `Intl` is provided by the runtime (V8/ICU), so it stays current with
// Electron upgrades instead of shipping a frozen npm copy.

/**
 * Matches an ISO 8601 date or date-time string (optionally with a time and a
 * `Z`/offset suffix). Used as a lightweight, strict-ish validity check.
 */
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Returns `true` when `value` is a valid ISO 8601 date/date-time string.
 *
 * Replacement for `moment(value, moment.ISO_8601, true).isValid()`.
 */
export function isIso8601DateString(value: string): boolean {
  return ISO_8601_REGEX.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * The host's currently configured IANA time zone (e.g. `Europe/Warsaw`).
 *
 * Replacement for `moment.tz.guess(true)`. `resolvedOptions().timeZone` honors
 * the OS setting and the `TZ` environment variable.
 */
export function guessUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * All canonical IANA time zones supported by the runtime.
 *
 * Replacement for `moment.tz.names()`. Note that `Intl.supportedValuesOf`
 * returns canonical zones only (no historical aliases such as `US/Pacific`),
 * which are still accepted as input to `Intl.DateTimeFormat`.
 */
export function getAvailableTimezones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof intl.supportedValuesOf === "function") {
    try {
      const zones = intl.supportedValuesOf("timeZone");

      // `Intl` does not always enumerate "UTC" even though it accepts it as
      // input; moment.tz.names() always listed it, so keep it available.
      return zones.includes("UTC") ? zones : ["UTC", ...zones];
    } catch {
      // ignore and fall back to the guessed zone below
    }
  }

  return [guessUserTimezone()];
}

/**
 * Formats a date as an ISO 8601 string with the offset of the given IANA time
 * zone, e.g. `2024-03-09T14:30:00+01:00`.
 *
 * Replacement for `moment.tz(date, timeZone).format()`.
 */
export function formatInTimeZone(date: Date | string | number, timeZone: string): string {
  const value = date instanceof Date ? date : new Date(date);

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "longOffset",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );

  // `longOffset` yields e.g. "GMT+01:00", "GMT" or "GMT+00:00" (the exact
  // spelling for a zero offset depends on the ICU version). Normalize to an
  // ISO-8601 offset, collapsing any zero offset to "Z" (matching moment's UTC
  // output and the preferred GUI presentation).
  const rawOffset = (parts.timeZoneName ?? "").replace("GMT", "").replace("UTC", "");
  const offset = rawOffset === "" || /^[+-]00:?00$/.test(rawOffset) ? "Z" : rawOffset;

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/**
 * Humanized relative time from now, e.g. `2 hours ago` or `in 3 days`.
 *
 * Replacement for `moment(date).fromNow()`. Uses `Intl.RelativeTimeFormat`, so
 * the exact wording follows the runtime locale and differs slightly from
 * moment's phrasing.
 */
export function formatRelativeTime(date: Date | string | number): string {
  const value = date instanceof Date ? date : new Date(date);
  const diffMs = value.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absMs < minute) {
    return rtf.format(Math.round(diffMs / second), "second");
  }
  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  if (absMs < month) {
    return rtf.format(Math.round(diffMs / day), "day");
  }
  if (absMs < year) {
    return rtf.format(Math.round(diffMs / month), "month");
  }

  return rtf.format(Math.round(diffMs / year), "year");
}
