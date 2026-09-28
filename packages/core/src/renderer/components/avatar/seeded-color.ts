/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Saturation and lightness are fixed, and only the hue is derived from the
 * seed, so that every colour this can produce is dark enough to carry white
 * text. At 27% lightness the worst hue still clears WCAG AA against white with
 * room to spare -- see the test, which checks all 360 of them.
 */
const saturation = 60;
const lightness = 27;

/**
 * A colour for `seed`, stable across renders and across restarts.
 *
 * Replaces `randomColor({ seed, luminosity: "dark" })` from the `randomcolor`
 * package, which was last released in 2020-07. Its "dark" is a brightness band
 * relative to the hue rather than a contrast guarantee: measured over 3000
 * seeds, 40% of what it returned failed WCAG AA against white text, the worst
 * being #dfe202 at 1.40:1.
 */
export const seededColor = (seed: string): string => {
  // FNV-1a
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  // The comma form, because jsdom's CSS parser does not accept the
  // space-separated one and drops the declaration instead of failing
  return `hsl(${(hash >>> 0) % 360}, ${saturation}%, ${lightness}%)`;
};
