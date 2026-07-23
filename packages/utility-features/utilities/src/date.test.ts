/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatInTimeZone, getAvailableTimezones, guessUserTimezone, isIso8601DateString } from "./date";

describe("isIso8601DateString", () => {
  it("accepts ISO 8601 date and date-time strings", () => {
    expect(isIso8601DateString("2024-03-09")).toBe(true);
    expect(isIso8601DateString("2024-03-09T14:30:00Z")).toBe(true);
    expect(isIso8601DateString("2024-03-09T14:30:00.123Z")).toBe(true);
    expect(isIso8601DateString("2024-03-09T14:30:00+01:00")).toBe(true);
  });

  it("rejects non-ISO strings", () => {
    expect(isIso8601DateString("not a date")).toBe(false);
    expect(isIso8601DateString("09/03/2024")).toBe(false);
    expect(isIso8601DateString("")).toBe(false);
  });
});

describe("formatInTimeZone", () => {
  const instant = new Date("2024-03-09T13:30:00Z");

  it("formats as ISO 8601 with the zone offset", () => {
    expect(formatInTimeZone(instant, "UTC")).toBe("2024-03-09T13:30:00+00:00");
    expect(formatInTimeZone(instant, "Europe/Warsaw")).toBe("2024-03-09T14:30:00+01:00");
    expect(formatInTimeZone(instant, "Asia/Kolkata")).toBe("2024-03-09T19:00:00+05:30");
  });

  it("accepts string and number inputs", () => {
    expect(formatInTimeZone("2024-03-09T13:30:00Z", "UTC")).toBe("2024-03-09T13:30:00+00:00");
    expect(formatInTimeZone(instant.getTime(), "UTC")).toBe("2024-03-09T13:30:00+00:00");
  });
});

describe("timezone discovery", () => {
  it("guesses a non-empty IANA time zone", () => {
    expect(guessUserTimezone()).toEqual(expect.any(String));
    expect(guessUserTimezone().length).toBeGreaterThan(0);
  });

  it("lists canonical IANA time zones", () => {
    const zones = getAvailableTimezones();

    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("UTC");
  });
});
