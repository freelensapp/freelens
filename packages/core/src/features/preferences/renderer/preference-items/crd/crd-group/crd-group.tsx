/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import * as yaml from "js-yaml";
import { observer } from "mobx-react";
import React from "react";
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { DEFAULT_CONFIG_YAML } from "./default-config";

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

  // Help message for YAML format
  const hint =
    "Define custom CRD groups in YAML format. Flexible structure with string pattern matching:\n" +
    "- Arrays for top-level patterns\n" +
    "- Objects with nested sublevels\n" +
    "- Null value to hide entries\n" +
    '- Empty string "" to capture all patterns\n' +
    'Example:\nKEDA:\n  - keda.sh\n  - Eventing:\n    - eventing.keda.sh\nlinkerd.io:\n  - policy.linkerd.io\n  - ""\nignored: null';

  const [validationError, setValidationError] = React.useState<string | null>(null);

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
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <SubTitle title="CRD Groups" />
      </div>
      <Input
        theme="round-black"
        placeholder={yamlPlaceholder}
        value={crdGroup}
        onChange={(v) => setCrdGroup(v)}
        multiLine={true}
        rows={20}
        onBlur={() => {
          if (validateConfiguration(crdGroup)) {
            // Store YAML configuration directly
            state.crdGroup = crdGroup;
          }
        }}
        validators={[yamlValidator]}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
        <div>
          <button
            type="button"
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#222",
              color: "#fff",
              cursor: "pointer",
            }}
            onClick={() => {
              try {
                // Use the default YAML configuration
                setCrdGroup(DEFAULT_CONFIG_YAML);
                setValidationError(null);
              } catch (error) {
                setValidationError(`Initialization failed: ${error instanceof Error ? error.message : "Error"}`);
              }
            }}
          >
            Reset to default configuration
          </button>
        </div>
      </div>{" "}
      <pre className="hint" style={{ whiteSpace: "pre-wrap", margin: "8px 0", fontSize: "0.85em", color: "#888" }}>
        {hint}
      </pre>
      {validationError && <div style={{ color: "red", marginTop: "8px" }}>{validationError}</div>}
    </section>
  );
});

export const CrdGroup = withInjectables<Dependencies, {}>(NonInjectedCrdGroup, {
  getProps: (di): Dependencies => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
