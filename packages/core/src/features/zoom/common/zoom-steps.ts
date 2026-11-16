/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The zoom levels the application offers, in percent: the steps of Chromium's own zoom.
 */
export const zoomSteps = [67, 75, 80, 90, 100, 110, 125, 150, 175, 200] as const;

export type ZoomStep = (typeof zoomSteps)[number];

export const defaultZoom: ZoomStep = 100;

export const isZoomStep = (value: unknown): value is ZoomStep => zoomSteps.includes(value as ZoomStep);

/**
 * The next larger step, or the last one when there is none.
 */
export const getNextZoomStep = (zoom: number): ZoomStep =>
  zoomSteps.find((step) => step > zoom) ?? zoomSteps[zoomSteps.length - 1];

/**
 * The next smaller step, or the first one when there is none.
 */
export const getPreviousZoomStep = (zoom: number): ZoomStep =>
  zoomSteps.findLast((step) => step < zoom) ?? zoomSteps[0];

/**
 * The zoom factor of Electron for a zoom in percent.
 */
export const toZoomFactor = (zoom: number) => zoom / 100;
