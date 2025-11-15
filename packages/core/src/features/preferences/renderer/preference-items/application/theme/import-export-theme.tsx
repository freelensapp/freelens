/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useRef } from "react";
import customThemeManagerInjectable from "./custom-theme-manager.injectable";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { CustomThemeManager } from "./custom-theme-manager.injectable";

interface Dependencies {
  customThemeManager: CustomThemeManager;
}

interface ImportExportThemeProps extends Dependencies {
  currentTheme?: LensTheme;
  onImportSuccess?: (theme: LensTheme) => void;
  onError?: (error: string) => void;
}

const NonInjectedImportExportTheme = observer(
  ({ currentTheme, customThemeManager, onImportSuccess, onError }: ImportExportThemeProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
      if (!currentTheme) {
        onError?.("No theme selected to export");
        return;
      }

      try {
        const themeJson = customThemeManager.exportTheme(currentTheme);
        const blob = new Blob([themeJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${currentTheme.name.replace(/\s+/g, "-").toLowerCase()}-theme.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        onError?.(`Failed to export theme: ${String(error)}`);
      }
    };

    const handleImport = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) return;

      try {
        const text = await file.text();
        const result = customThemeManager.importTheme(text);

        if (result.success && result.theme) {
          onImportSuccess?.(result.theme);
        } else {
          onError?.(result.error || "Failed to import theme");
        }
      } catch (error) {
        onError?.(`Failed to read theme file: ${String(error)}`);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    return (
      <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
        <button
          onClick={handleExport}
          disabled={!currentTheme}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            background: "var(--buttonDefaultBackground)",
            color: "var(--textColorAccent)",
            fontSize: "13px",
            cursor: currentTheme ? "pointer" : "not-allowed",
            opacity: currentTheme ? 1 : 0.5,
          }}
          type="button"
        >
          Export Theme
        </button>

        <button
          onClick={handleImport}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            background: "var(--buttonDefaultBackground)",
            color: "var(--textColorAccent)",
            fontSize: "13px",
            cursor: "pointer",
          }}
          type="button"
        >
          Import Theme
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
    );
  },
);

export const ImportExportTheme = withInjectables<Dependencies, ImportExportThemeProps>(
  NonInjectedImportExportTheme,
  {
    getProps: (di, props) => ({
      ...props,
      customThemeManager: di.inject(customThemeManagerInjectable),
    }),
  },
);
