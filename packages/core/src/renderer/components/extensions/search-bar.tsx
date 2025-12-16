/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "6px",
          border: "1px solid var(--borderColor)",
          backgroundColor: "var(--layoutBackground)",
          color: "var(--textColorPrimary)",
          width: "100%",
          fontSize: "0.875rem",
          outline: "none",
        }}
      />
    </div>
  );
};
