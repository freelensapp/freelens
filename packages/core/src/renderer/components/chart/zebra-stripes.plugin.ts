/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Plugin for drawing stripe bars on top of any timeseries barchart
// Based on cover DIV element with repeating-linear-gradient style

import moment from "moment";

import type { Chart, ChartType, Plugin } from "chart.js";
import type { Moment } from "moment";

const defaultOptions = {
  stripeColor: "#ffffff08",
  interval: 10,
};

export interface ZebraStripesOptions {
  stripeColor: string;
  interval: number;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    zebraStripes?: ZebraStripesOptions;
  }
}

export class ZebraStripesPlugin implements Plugin<ChartType, ZebraStripesOptions> {
  readonly id = "zebraStripes";
  updated: Moment | null = null;
  options: ZebraStripesOptions;

  constructor(options?: Partial<ZebraStripesOptions>) {
    this.options = Object.assign({}, defaultOptions, options);
  }

  getOptions(chart: Chart): Partial<ZebraStripesOptions> | undefined {
    return chart.options.plugins?.zebraStripes;
  }

  getLastUpdate(chart: Chart) {
    const data = chart.data.datasets?.[0]?.data?.[0] as { x?: number | string };

    return moment.unix(parseInt(data.x as string));
  }

  getStripesElem(chart: Chart) {
    return chart.canvas?.parentElement?.querySelector<HTMLElement>(".zebra-cover");
  }

  removeStripesElem(chart: Chart) {
    const elem = this.getStripesElem(chart);

    if (elem) {
      chart.canvas?.parentElement?.removeChild(elem);
    }
  }

  updateOptions(chart: Chart, options?: Partial<ZebraStripesOptions>) {
    this.options = {
      ...defaultOptions,
      ...(options ?? this.getOptions(chart)),
    };
  }

  getStripeMinutes() {
    return this.options.interval < 10 ? 0 : 10;
  }

  renderStripes(chart: Chart) {
    if (!chart.data.datasets?.length) return;
    const { interval, stripeColor } = this.options;
    const { top, left, bottom, right } = chart.chartArea;
    const step = (right - left) / interval;
    const stripeWidth = step * this.getStripeMinutes();
    const cover = document.createElement("div");
    const styles = cover.style;

    if (this.getStripesElem(chart)) return;

    cover.className = "zebra-cover";
    styles.width = `${right - left}px`;
    styles.left = `${left}px`;
    styles.top = `${top}px`;
    styles.height = `${bottom - top}px`;
    styles.backgroundImage = `
      repeating-linear-gradient(to right, ${stripeColor} 0px, ${stripeColor} ${stripeWidth}px,
      transparent ${stripeWidth}px, transparent ${stripeWidth * 2 + step}px)
     `;
    chart.canvas?.parentElement?.appendChild(cover);
  }

  afterInit(chart: Chart, _args: unknown, options: ZebraStripesOptions) {
    if (!chart.data.datasets?.length) return;
    this.updateOptions(chart, options);
    this.updated = this.getLastUpdate(chart);
  }

  afterUpdate(chart: Chart, _args: unknown, options: ZebraStripesOptions) {
    this.updateOptions(chart, options);
    this.renderStripes(chart);
  }

  resize(chart: Chart) {
    this.removeStripesElem(chart);
  }

  afterDatasetUpdate(chart: Chart): void {
    this.updated ??= this.getLastUpdate(chart);

    const { interval } = this.options;
    const { left, right } = chart.chartArea;
    const step = (right - left) / interval;
    const diff = moment(this.updated).diff(this.getLastUpdate(chart), "minutes");
    const minutes = Math.abs(diff);

    this.removeStripesElem(chart);
    this.renderStripes(chart);

    if (minutes > 0) {
      // Move position regarding to difference in time
      const cover = this.getStripesElem(chart);

      if (cover) {
        cover.style.backgroundPositionX = `${-step * minutes}px`;
      }
    }
  }
}
