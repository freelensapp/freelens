/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./radio.scss";
import type { SingleOrMany, StrictReactNode } from "@freelensapp/utilities";
import { cssNames, noop } from "@freelensapp/utilities";
import React, { useContext, useRef } from "react";

export interface RadioGroupProps<T> {
  className?: string;
  value?: T;
  asButtons?: boolean;
  disabled?: boolean;
  onChange: (value: T) => void;
  children: SingleOrMany<React.ReactElement<RadioProps<T>>>;
}

interface RadioGroupContext {
  disabled: boolean;
  value: any | undefined;
  onSelect: (newValue: any) => void;
}

const radioGroupContext = React.createContext<RadioGroupContext>({
  disabled: false,
  value: undefined,
  onSelect: noop,
});

export function RadioGroup<T>({
  value,
  asButtons,
  disabled = false,
  onChange,
  className,
  children,
}: RadioGroupProps<T>) {
  return (
    <div className={cssNames("RadioGroup", { buttonsView: asButtons }, className)}>
      <radioGroupContext.Provider value={{ disabled, onSelect: onChange, value }}>
        {children}
      </radioGroupContext.Provider>
    </div>
  );
}

export interface RadioProps<T> {
  className?: string;
  label: StrictReactNode;
  value: T;
  disabled?: boolean;
}

export function Radio<T>({ className, label, value, disabled = false }: RadioProps<T>) {
  const ctx = useContext(radioGroupContext);
  const ref = useRef<HTMLLabelElement | null>(null);
  const checked = ctx.value === value;

  return (
    <label
      className={cssNames("Radio flex align-center", className, {
        checked,
        disabled: disabled || ctx.disabled,
      })}
      tabIndex={checked ? undefined : 0}
      onKeyDown={(event) => {
        // Spacebar or Enter key
        if (event.key === " " || event.key === "Enter") {
          ref.current?.click();
          event.preventDefault();
        }
      }}
      ref={ref}
    >
      <input type="radio" checked={checked} onChange={() => ctx.onSelect(value)} disabled={disabled || ctx.disabled} />
      <i className="tick flex center" />
      {label ? <div className="label">{label}</div> : null}
    </label>
  );
}
