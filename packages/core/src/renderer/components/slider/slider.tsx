/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Wrapper for <Slider/> component
// API docs: https://material-ui.com/lab/api/slider/
import "./slider.scss";

import assert from "assert";
import { cssNames } from "@freelensapp/utilities";
import type { SliderProps as MaterialSliderProps, SliderClassKey } from "@mui/material/Slider";
import MaterialSlider from "@mui/material/Slider";
import React, { Component } from "react";

export interface SliderProps extends Omit<MaterialSliderProps, "onChange"> {
  className?: string;
  onChange(evt: Event, value: number): void;
}

const defaultProps: Partial<SliderProps> = {
  step: 1,
  min: 0,
  max: 100,
};

export class Slider extends Component<SliderProps> {
  static defaultProps = defaultProps as object;

  private classNames: Partial<{ [P in SliderClassKey]: string }> = {
    track: "track",
    thumb: "thumb",
    disabled: "disabled",
    vertical: "vertical",
  };

  render() {
    const { className, onChange, ...sliderProps } = this.props;

    return (
      <MaterialSlider
        {...sliderProps}
        onChange={(event, value) => {
          assert(!Array.isArray(value));
          onChange?.(event, value);
        }}
        classes={{
          root: cssNames("Slider", className),
          ...this.classNames,
        }}
      />
    );
  }
}
