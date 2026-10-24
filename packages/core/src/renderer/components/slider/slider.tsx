/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Wrapper for <Slider/> component
// API docs: https://mui.com/material-ui/api/slider/
import "./slider.scss";

import assert from "node:assert";
import { cssNames } from "@freelensapp/utilities";
import MaterialSlider from "@mui/material/Slider";
import { Component } from "react";

import type { SyntheticEvent } from "react";

/**
 * The props of {@link Slider}.
 *
 * These are written out by hand instead of being derived from the props of the
 * underlying `@mui/material` slider, because this component is part of the
 * published extension API and deriving them would force every extension author
 * to resolve `@mui/material` in order to compile against it.
 *
 * The surface is deliberately limited to the single-value slider: `value` is a
 * `number` and never a range.
 */
export interface SliderProps {
  className?: string;

  /** @default 0 */
  min?: number;

  /** @default 100 */
  max?: number;

  /** @default 1 */
  step?: number;

  value?: number;

  disabled?: boolean;

  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";

  /**
   * Whether the value is shown in a label above the thumb.
   *
   * @default "off"
   */
  valueLabelDisplay?: "auto" | "on" | "off";

  /**
   * Called continuously while the thumb is being dragged.
   */
  onChange(evt: Event, value: number): void;

  /**
   * Called once the thumb is released, or after a click on the track.
   */
  onChangeCommitted?(evt: Event | SyntheticEvent, value: number): void;
}

const defaultProps: Partial<SliderProps> = {
  step: 1,
  min: 0,
  max: 100,
};

export class Slider extends Component<SliderProps> {
  static defaultProps = defaultProps as object;

  private classNames = {
    track: "track",
    thumb: "thumb",
    disabled: "disabled",
    vertical: "vertical",
  };

  render() {
    const { className, onChange, onChangeCommitted, ...sliderProps } = this.props;

    return (
      <MaterialSlider
        {...sliderProps}
        onChange={(event, value) => {
          assert(!Array.isArray(value));
          onChange?.(event, value);
        }}
        onChangeCommitted={
          onChangeCommitted &&
          ((event, value) => {
            assert(!Array.isArray(value));
            onChangeCommitted(event, value);
          })
        }
        classes={{
          root: cssNames("Slider", className),
          ...this.classNames,
        }}
      />
    );
  }
}
