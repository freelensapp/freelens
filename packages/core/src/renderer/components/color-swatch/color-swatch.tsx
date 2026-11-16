/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withTooltip } from "@freelensapp/tooltip";
import { cssNames } from "@freelensapp/utilities";
import { useEffect, useRef } from "react";
import { getTextColorOnAccent } from "../../themes/accent-colors";
import styles from "./color-swatch.module.scss";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { ButtonHTMLAttributes } from "react";

export interface ColorSwatchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "children"> {
  /**
   * The color the swatch shows. A swatch without one shows its children as text instead, for a
   * choice that is not a color.
   */
  color?: string;
  selected: boolean;
  children?: StrictReactNode;
}

export const ColorSwatch = withTooltip(
  ({ color, selected, className, style, children, ...buttonProps }: ColorSwatchProps) => (
    <button
      type="button"
      aria-pressed={selected}
      className={cssNames(styles.swatch, className, { [styles.textSwatch]: !color, [styles.selected]: selected })}
      style={color ? { ...style, background: color } : style}
      {...buttonProps}
    >
      {children}
    </button>
  ),
);

export const ColorSwatchGroup = ({ label, children }: { label: string; children: StrictReactNode }) => (
  <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
    {children}
  </div>
);

export interface CustomColorSwatchProps {
  /**
   * The custom color in use, or `undefined` when the value is one of the listed colors or none.
   */
  value: string | undefined;
  onChange: (color: string) => void;
  "data-testid"?: string;
}

const hexColor = /^#[0-9a-f]{6}$/i;

/**
 * A swatch that opens the color picker of the system for any color. It commits on the `change`
 * event of the input, when the picker closes, rather than on every `input` event while the
 * color is dragged, which is when React's `onChange` fires.
 */
export const CustomColorSwatch = ({ value, onChange, "data-testid": testId }: CustomColorSwatchProps) => {
  const input = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useEffect(() => {
    const element = input.current;
    const commit = () => element && onChangeRef.current(element.value);

    element?.addEventListener("change", commit);

    return () => element?.removeEventListener("change", commit);
  }, []);

  const openPicker = () => {
    const element = input.current;

    if (!element) {
      return;
    }

    element.value = value && hexColor.test(value) ? value : "#000000";

    // jsdom has no showPicker; a click opens the picker there as well as in older engines.
    if (typeof element.showPicker === "function") {
      element.showPicker();
    } else {
      element.click();
    }
  };

  return (
    <span className="relative inline-flex">
      <ColorSwatch
        tooltip="Pick any color"
        selected={value !== undefined}
        style={value ? { background: value, color: getTextColorOnAccent(value) } : undefined}
        onClick={openPicker}
        data-testid={testId}
      >
        Custom
      </ColorSwatch>
      <input
        ref={input}
        type="color"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid={testId && `${testId}-input`}
      />
    </span>
  );
};
