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
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
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

// Default configuration is imported from default-config.ts

const NonInjectedCrdGroup = observer(({ state }: Dependencies) => {
  const [crdGroup, setCrdGroup] = React.useState(state.crdGroup || "");

  // Initial setup - set default configuration if empty
  React.useEffect(() => {
    if (!crdGroup.trim()) {
      // If empty, set default
      setCrdGroup(DEFAULT_CONFIG_YAML);
    }
  }, []);

  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Function to merge user config with default config
  const getMergedConfig = React.useCallback(() => {
    try {
      // Parse default config
      const [defaultParsed] = tryParseYaml(DEFAULT_CONFIG_YAML);

      // Parse user config
      const userConfig = crdGroup.trim();
      if (!userConfig) {
        return DEFAULT_CONFIG_YAML;
      }

      const [userParsed, error] = tryParseYaml(userConfig);
      if (error || !userParsed) {
        return DEFAULT_CONFIG_YAML; // Fallback to default if user config is invalid
      }

      // Smart merge: user config takes precedence, but preserve structure
      const mergedConfig: Record<string, any> = {};

      // First, add all user-defined groups
      Object.keys(userParsed).forEach((key) => {
        mergedConfig[key] = userParsed[key];
      });

      // Then, add default groups that are not overridden by user
      Object.keys(defaultParsed).forEach((key) => {
        if (!(key in mergedConfig)) {
          mergedConfig[key] = defaultParsed[key];
        }
      });

      return yaml.dump(mergedConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });
    } catch (error) {
      return DEFAULT_CONFIG_YAML;
    }
  }, [crdGroup]);

  // Function to get preview info about the merge
  const getMergeInfo = React.useCallback(() => {
    try {
      const [defaultParsed] = tryParseYaml(DEFAULT_CONFIG_YAML);
      const userConfig = crdGroup.trim();

      if (!userConfig) {
        return {
          userGroups: 0,
          defaultGroups: Object.keys(defaultParsed).length,
          overriddenGroups: 0,
        };
      }

      const [userParsed, error] = tryParseYaml(userConfig);
      if (error || !userParsed) {
        return {
          userGroups: 0,
          defaultGroups: Object.keys(defaultParsed).length,
          overriddenGroups: 0,
        };
      }

      const userGroupKeys = Object.keys(userParsed);
      const defaultGroupKeys = Object.keys(defaultParsed);
      const overriddenGroups = userGroupKeys.filter((key) => defaultGroupKeys.includes(key));

      return {
        userGroups: userGroupKeys.length,
        defaultGroups: defaultGroupKeys.length,
        overriddenGroups: overriddenGroups.length,
      };
    } catch (error) {
      return {
        userGroups: 0,
        defaultGroups: 0,
        overriddenGroups: 0,
      };
    }
  }, [crdGroup]);

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

    // Parse succeeded, now validate the structure more deeply
    try {
      // Check the structure
      let valid = true;
      Object.entries(parsed).forEach(([key, val]) => {
        // Value can be null (to hide), an array of strings, or an object of sub-levels
        if (val === null) {
          // Valid - null is allowed
        } else if (Array.isArray(val)) {
          // Check that each element is either a string or an object of sub-levels
          for (const item of val) {
            if (typeof item === "string") {
              // Valid - strings are allowed
            } else if (typeof item === "object" && item !== null) {
              // Check the structure of sub-levels
              Object.entries(item).forEach(([subKey, subVal]) => {
                if (subVal !== null && !Array.isArray(subVal)) {
                  valid = false;
                  setValidationError(`The value for sub-level "${subKey}" in "${key}" must be an array or null`);
                }
              });
            } else {
              valid = false;
              setValidationError(`Each element of "${key}" must be a string or an object of sub-levels`);
            }
          }
        } else if (typeof val === "object") {
          // Check the structure of sub-levels
          Object.entries(val).forEach(([subKey, subVal]) => {
            if (subVal !== null && !Array.isArray(subVal)) {
              valid = false;
              setValidationError(`The value for sub-level "${subKey}" in "${key}" must be an array or null`);
            }
          });
        } else {
          valid = false;
          setValidationError(`The value for "${key}" must be an array, an object of sub-levels, or null`);
        }
      });

      if (valid) {
        setValidationError(null);
      }

      return valid;
    } catch (error) {
      setValidationError(`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    }
  };

  const yamlValidator = {
    validate: validateConfiguration,
    message: `Format must be valid YAML.`,
  };

  const yamlPlaceholder =
    'KEDA:\n  - keda.sh\n  - Eventing:\n    - eventing.keda.sh\nlinkerd.io:\n  - policy.linkerd.io\n  - ""\nignored: null';

  return (
    <section className="crd-group-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <SubTitle title="CRD Groups" />
      </div>

      {/* Explanation text */}
      <div className="explanation-box">
        <h4>How it works:</h4>
        <p>
          • <strong>Edit area</strong>: Enter your custom YAML configuration (merges with defaults)
        </p>
        <p>
          • <strong>Default configuration</strong>: View the base settings (optional display)
        </p>
        <p>
          • <strong>Final result</strong>: View the automatic merge of your settings with defaults (optional display)
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
          Define custom CRD groups with flexible structure and string pattern matching:
          <br />• Arrays for top-level patterns
          <br />• Objects with nested sublevels
          <br />• Null value to hide entries
          <br />• Empty string "" to capture all patterns
        </div>
        <div className="help-example">
          <strong>Example:</strong>
          <pre>{`KEDA:
  - keda.sh
  - Eventing:
    - eventing.keda.sh
linkerd.io:
  - policy.linkerd.io
Other:
  - ""`}</pre>
        </div>
      </div>

      {/* User configuration section */}
      <div className="user-config-section">
        <label>Your custom configuration:</label>
        <Input
          theme="round-black"
          placeholder={yamlPlaceholder}
          value={crdGroup}
          onChange={(v) => setCrdGroup(v)}
          multiLine={true}
          rows={15}
          onBlur={() => {
            if (validateConfiguration(crdGroup)) {
              // Store YAML configuration directly
              state.crdGroup = crdGroup;
            }
          }}
          validators={[yamlValidator]}
        />
      </div>

      {/* Advanced view with DrawerParamToggler */}
      <DrawerParamToggler label="Configuration Details">
        <div className="advanced-section">
          {/* Merge info */}
          <div className="merge-info">
            <strong>Merge information:</strong>
            {(() => {
              const info = getMergeInfo();
              return (
                <div className="info-details">
                  • Custom groups: {info.userGroups}
                  <br />• Default groups: {info.defaultGroups}
                  <br />• Overridden groups: {info.overriddenGroups}
                </div>
              );
            })()}
          </div>

          <div className="config-grid">
            {/* Default configuration */}
            <div className="config-column">
              <label>Default configuration:</label>
              <textarea readOnly value={DEFAULT_CONFIG_YAML} className="readonly-textarea default-config" />
            </div>

            {/* Merged configuration */}
            <div className="config-column">
              <label>Final result (merged):</label>
              <textarea readOnly value={getMergedConfig()} className="readonly-textarea merged-config" />
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
