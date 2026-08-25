/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import * as yaml from "js-yaml";
import { observer } from "mobx-react";
import React from "react";
import { DrawerParamToggler } from "../../../../../../renderer/components/drawer/drawer-param-toggler";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { MonacoEditor } from "../../../../../../renderer/components/monaco-editor";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { DEFAULT_CONFIG_YAML } from "./default-config";
import "./crd-group.scss";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

/**
 * Parse a YAML string and return the parsed object and any error
 */
function tryParseYaml(str: string): [any, string | null] {
  try {
    if (!str.trim()) {
      return [{}, null];
    }

    const parsed = yaml.load(str);

    // Verify it's an object after parsing
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [null, "Configuration must be a valid YAML object"];
    }

    return [parsed, null];
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      return [null, `YAML Error: ${error.message}`];
    }
    return [null, `YAML Error: ${error instanceof Error ? error.message : "Invalid format"}`];
  }
}

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedCrdGroup = observer(({ state }: Dependencies) => {
  const [crdGroup, setCrdGroup] = React.useState(state.crdGroup || "");

  React.useEffect(() => {
    if (!crdGroup.trim()) {
      setCrdGroup(DEFAULT_CONFIG_YAML);
    }
  }, []);

  const [validationError, setValidationError] = React.useState<string | null>(null);

  const validateStructure = (parsed: Record<string, any>): string | null => {
    for (const [key, val] of Object.entries(parsed)) {
      if (val === null) continue;
      if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string") continue;
          if (typeof item === "object" && item !== null) {
            for (const [subKey, subVal] of Object.entries(item)) {
              if (subVal !== null && !Array.isArray(subVal)) {
                return `The value for sub-level "${subKey}" in "${key}" must be an array or null`;
              }
            }
          } else {
            return `Each element of "${key}" must be a string or an object of sub-levels`;
          }
        }
      } else if (typeof val === "object") {
        for (const [subKey, subVal] of Object.entries(val)) {
          if (subVal !== null && !Array.isArray(subVal)) {
            return `The value for sub-level "${subKey}" in "${key}" must be an array or null`;
          }
        }
      } else {
        return `The value for "${key}" must be an array, an object of sub-levels, or null`;
      }
    }
    return null;
  };

  const isValidConfiguration = (value: string): boolean => {
    if (!value.trim()) return true;
    const [parsed, parseError] = tryParseYaml(value);
    if (parseError) return false;
    try {
      return validateStructure(parsed) === null;
    } catch {
      return false;
    }
  };

  const validateConfiguration = (value: string): boolean => {
    if (!value.trim()) {
      setValidationError(null);
      return true;
    }
    const [parsed, parseError] = tryParseYaml(value);
    if (parseError) {
      setValidationError(parseError);
      return false;
    }
    try {
      const structureError = validateStructure(parsed);
      setValidationError(structureError);
      return structureError === null;
    } catch (error) {
      setValidationError(`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    }
  };

  React.useEffect(() => {
    if (isValidConfiguration(crdGroup)) {
      state.crdGroup = crdGroup;
    }
  }, [crdGroup, state]);

  const readOnlyEditorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontSize: 13,
    lineNumbers: "on" as const,
    folding: true,
    tabSize: 2,
    wordWrap: "on" as const,
    renderWhitespace: "selection" as const,
    bracketPairColorization: { enabled: true },
    readOnly: true,
    contextmenu: false,
    cursorStyle: "line-thin" as const,
    selectionHighlight: false,
    occurrencesHighlight: "off" as const,
    domReadOnly: true,
    selectOnLineNumbers: false,
  };

  const mergedConfig = React.useMemo(() => {
    try {
      const [defaultParsed] = tryParseYaml(DEFAULT_CONFIG_YAML);
      const userConfig = crdGroup.trim();
      if (!userConfig) return DEFAULT_CONFIG_YAML;
      const [userParsed, error] = tryParseYaml(userConfig);
      if (error || !userParsed) return DEFAULT_CONFIG_YAML;
      const merged: Record<string, any> = { ...userParsed };
      for (const key of Object.keys(defaultParsed)) {
        if (!(key in merged)) merged[key] = defaultParsed[key];
      }
      return yaml.dump(merged, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
    } catch {
      return DEFAULT_CONFIG_YAML;
    }
  }, [crdGroup]);

  const mergeInfo = React.useMemo(() => {
    try {
      const [defaultParsed] = tryParseYaml(DEFAULT_CONFIG_YAML);
      const userConfig = crdGroup.trim();
      const defaultGroupKeys = Object.keys(defaultParsed);
      if (!userConfig) return { userGroups: 0, defaultGroups: defaultGroupKeys.length, overriddenGroups: 0 };
      const [userParsed, error] = tryParseYaml(userConfig);
      if (error || !userParsed) return { userGroups: 0, defaultGroups: defaultGroupKeys.length, overriddenGroups: 0 };
      const userGroupKeys = Object.keys(userParsed);
      return {
        userGroups: userGroupKeys.length,
        defaultGroups: defaultGroupKeys.length,
        overriddenGroups: userGroupKeys.filter((key) => defaultGroupKeys.includes(key)).length,
      };
    } catch {
      return { userGroups: 0, defaultGroups: 0, overriddenGroups: 0 };
    }
  }, [crdGroup]);

  return (
    <section className="crd-group-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <SubTitle title="CRD Groups" />
      </div>

      {/* Explanation text */}
      <div className="explanation-box">
        <h4>How it works:</h4>
        <p>
          • <strong>Edit area</strong>: Enter your custom YAML configuration (
          <span className="text-accent">merges with defaults</span>)
        </p>
        <p>
          • <strong>Default configuration</strong>: View the base settings (
          <span className="text-accent">optional display</span>)
        </p>
        <p>
          • <strong>Final result</strong>: View the automatic merge of your settings with defaults (
          <span className="text-accent">optional display</span>)
        </p>
        <p>
          • <strong>Tip</strong>: Leave empty to use only default settings, or add custom groups that will be merged
          automatically
        </p>
      </div>

      {/* Technical help section */}
      <div className="technical-help">
        <h4>YAML Format Guide:</h4>
        <div className="help-content">
          Define custom CRD groups with <span className="text-highlight">flexible structure</span> and{" "}
          <span className="text-highlight">string pattern matching</span>:
          <br />• <strong>Arrays</strong> for top-level patterns
          <br />• <strong>Objects</strong> with nested sublevels
          <br />• <strong>Null value</strong> to hide entries
          <br />• <strong>Empty string ""</strong> to capture all patterns
        </div>
        <div className="help-example">
          <strong>Example:</strong>
          <pre>{`KEDA:
  - keda.sh
  - Eventing:
    - eventing.keda.sh
LinkedD:
  - policy.linkerd.io
Others:
  - ''`}</pre>
        </div>
      </div>

      {/* User configuration section */}
      <div className="user-config-section">
        <label>Your custom configuration:</label>
        <div className="monaco-editor-container">
          <MonacoEditor
            id="crd-group-config"
            language="yaml"
            value={crdGroup}
            onChange={(value) => {
              setCrdGroup(value);
              validateConfiguration(value);
            }}
            onError={(error) => {
              if (error) {
                setValidationError(`YAML syntax error: ${String(error)}`);
              }
            }}
            style={{
              height: 300,
              border: "1px solid var(--borderColor, #404040)",
              borderRadius: "4px",
            }}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 13,
              lineNumbers: "on",
              folding: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: "on",
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              suggest: {
                showKeywords: true,
                showSnippets: true,
              },
              acceptSuggestionOnEnter: "on",
              quickSuggestions: true,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
      </div>

      {/* Advanced view with DrawerParamToggler */}
      <DrawerParamToggler label="Configuration Details">
        <div className="advanced-section">
          {/* Merge info */}
          <div className="merge-info">
            <strong>Merge information:</strong>
            <div className="info-details">
              • Custom groups: {mergeInfo.userGroups}
              <br />• Default groups: {mergeInfo.defaultGroups}
              <br />• Overridden groups: {mergeInfo.overriddenGroups}
            </div>
          </div>

          <div className="config-grid">
            {/* Default configuration */}
            <div className="config-column">
              <label>Default configuration:</label>
              <MonacoEditor
                id="crd-group-default"
                language="yaml"
                value={DEFAULT_CONFIG_YAML}
                readOnly
                style={{
                  height: 200,
                  border: "1px solid var(--borderColor, #404040)",
                  borderRadius: "4px",
                }}
                options={readOnlyEditorOptions}
              />
            </div>

            {/* Merged configuration */}
            <div className="config-column">
              <label>Final result (merged):</label>
              <MonacoEditor
                id="crd-group-merged"
                language="yaml"
                value={mergedConfig}
                readOnly
                style={{
                  height: 200,
                  border: "1px solid var(--borderColor, #404040)",
                  borderRadius: "4px",
                }}
                options={readOnlyEditorOptions}
              />
            </div>
          </div>
        </div>
      </DrawerParamToggler>

      {validationError && <div className="validation-error">{validationError}</div>}
    </section>
  );
});

export const CrdGroup = withInjectables<Dependencies, {}>(NonInjectedCrdGroup, {
  getProps: (di): Dependencies => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
