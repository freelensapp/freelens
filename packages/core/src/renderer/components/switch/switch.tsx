/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./switch.module.scss";

import { cssNames } from "@freelensapp/utilities";
import type { ChangeEvent, HTMLProps } from "react";
import React from "react";

export interface SwitchProps extends Omit<HTMLProps<HTMLInputElement>, "onChange"> {
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}

export function Switch({ children, disabled, onChange, ...props }: SwitchProps) {
  return (
    <label className={cssNames(styles.Switch, { [styles.disabled]: disabled })} data-testid="switch">
      {children}
      <input
        type="checkbox"
        role="switch"
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked, event)}
        {...props}
      />
    </label>
  );
}
