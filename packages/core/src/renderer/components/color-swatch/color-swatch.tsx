/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./color-swatch.scss";

import { TooltipPosition, withTooltip } from "@freelensapp/tooltip";
import { cssNames } from "@freelensapp/utilities";
import { useEffect, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { getTextColorOnAccent } from "../../themes/accent-colors";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { ButtonHTMLAttributes } from "react";

export interface ColorSwatchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "children"> {
  /**
   * The color the swatch shows. A swatch without one shows its children as text instead, for a
   * choice that is not a color.
   */
  color?: string;
  /**
   * Whether the swatch is the chosen one, which its border and `aria-pressed` show.
   */
  selected: boolean;
  /**
   * Shown above or below the swatch while the pointer is over it.
   */
  tooltip?: string;
  children?: StrictReactNode;
}

const SwatchButton = withTooltip(
  ({ color, selected, className, style, children, ...buttonProps }: Omit<ColorSwatchProps, "tooltip">) => (
    <button
      type="button"
      aria-pressed={selected}
      data-text={color ? undefined : true}
      className={cssNames("ColorSwatch", className)}
      style={color ? { ...style, background: color } : style}
      {...buttonProps}
    >
      {children}
    </button>
  ),
);

// Above or below the swatch, as a tooltip beside it covers the swatches next to it.
const tooltipPositions = [TooltipPosition.TOP, TooltipPosition.BOTTOM];

/**
 * A button that shows a color, or a text for a choice that is not a color, among the others of a
 * `ColorSwatchGroup`.
 */
export const ColorSwatch = ({ tooltip, ...props }: ColorSwatchProps) => (
  <SwatchButton
    {...props}
    tooltip={tooltip ? { children: tooltip, preferredPositions: tooltipPositions } : undefined}
  />
);

export interface ColorSwatchGroupProps {
  /**
   * The accessible name of the group, such as what the color is for.
   */
  label: string;
  children: StrictReactNode;
}

/**
 * Lays out swatches in a row that wraps, as one group named by its label.
 */
export const ColorSwatchGroup = ({ label, children }: ColorSwatchGroupProps) => (
  <div className="ColorSwatchGroup" role="group" aria-label={label}>
    {children}
  </div>
);

export interface CustomColorSwatchProps {
  /**
   * The custom color in use, or `undefined` when the value is one of the listed colors or none.
   */
  value: string | undefined;
  /**
   * The color the picker starts from when no custom color is in use, such as the listed color
   * that is selected. It has to be a hex color to be used.
   */
  initialColor?: string;
  onChange: (color: string) => void;
  "data-testid"?: string;
}

const hexColor = /^#[0-9a-f]{6}$/i;
const fallbackColor = "#808080";

/**
 * A swatch that opens a picker for any color, with a field for its hex code. The color is
 * committed when the picker is released, when the field is left or confirmed, and when the
 * panel closes, rather than on every movement while the color is dragged.
 */
export const CustomColorSwatch = ({ value, initialColor, onChange, "data-testid": testId }: CustomColorSwatchProps) => {
  const startColor = () => [value, initialColor].find((color) => color && hexColor.test(color)) ?? fallbackColor;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(startColor);
  const wrapper = useRef<HTMLSpanElement>(null);
  const uncommitted = useRef<string | undefined>(undefined);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  const edit = (color: string) => {
    uncommitted.current = color;
    setDraft(color);
  };

  const commit = () => {
    const color = uncommitted.current;

    uncommitted.current = undefined;

    if (color) {
      onChangeRef.current(color);
    }
  };

  const close = () => {
    commit();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnPointerOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        close();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("pointerdown", closeOnPointerOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => commit, []);

  const toggle = () => {
    if (open) {
      close();
    } else {
      setDraft(startColor());
      setOpen(true);
    }
  };

  return (
    <span ref={wrapper} className="CustomColorSwatch">
      <ColorSwatch
        tooltip="Pick any color from the RGB palette, or enter its hex code"
        selected={value !== undefined}
        aria-expanded={open}
        style={value ? { background: value, color: getTextColorOnAccent(value) } : undefined}
        onClick={toggle}
        data-testid={testId}
      >
        Custom
      </ColorSwatch>
      {open && (
        <div className="CustomColorSwatch-panel" data-testid={testId && `${testId}-panel`}>
          <HexColorPicker
            color={draft}
            onChange={edit}
            onChangeEnd={(color) => {
              edit(color);
              commit();
            }}
          />
          <HexColorInput
            className="CustomColorSwatch-hex"
            color={draft}
            onChange={edit}
            onBlur={commit}
            onKeyDown={(event) => event.key === "Enter" && commit()}
            prefixed
            aria-label="Hex code of the color"
            data-testid={testId && `${testId}-hex`}
          />
        </div>
      )}
    </span>
  );
};
