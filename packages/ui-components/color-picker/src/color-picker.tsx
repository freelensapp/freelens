/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useState, useCallback } from "react";
import Color from "color";
import styles from "./color-picker.module.scss";

export interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, className }) => {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  const validateAndUpdate = useCallback(
    (newValue: string) => {
      try {
        const color = Color(newValue);
        setIsValid(true);
        onChange(color.hex());
      } catch {
        setIsValid(false);
      }
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);
      validateAndUpdate(newValue);
    },
    [validateAndUpdate],
  );

  const handleColorInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);
      onChange(newValue);
      setIsValid(true);
    },
    [onChange],
  );

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className={`${styles.colorPicker} ${className || ""}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputGroup}>
        <input
          type="color"
          value={inputValue}
          onChange={handleColorInputChange}
          className={styles.colorInput}
          title="Pick a color"
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className={`${styles.textInput} ${!isValid ? styles.invalid : ""}`}
          placeholder="#000000"
          maxLength={9}
        />
      </div>
      {!isValid && <span className={styles.error}>Invalid color format</span>}
    </div>
  );
};
