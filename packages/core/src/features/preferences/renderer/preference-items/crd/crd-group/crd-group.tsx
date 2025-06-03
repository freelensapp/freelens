/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedCrdGroup = observer(({ state }: Dependencies) => {
  const [crdGroup, setCrdGroup] = React.useState(state.crdGroup || "");

  // A more detailed hint describing the JSON structure
  const hint =
    'Define your custom CRD groups in JSON format. You can use a two-level structure. Example: { "KEDA": [{ "Eventing": ["eventing.keda.sh"] }, "keda.sh"], "linkerd.io": ["policy.linkerd.io", "linkerd.io"] }';

  const [validationError, setValidationError] = React.useState<string | null>(null);

  const jsonValidator = {
    validate: (value: string) => {
      if (!value.trim()) {
        setValidationError(null);
        return true;
      }
      try {
        const parsed = JSON.parse(value);

        // Verify that it's a valid object
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setValidationError("Configuration must be a valid JSON object");
          return false;
        }

        // Check the structure
        let valid = true;
        Object.entries(parsed).forEach(([key, val]) => {
          if (!Array.isArray(val)) {
            valid = false;
            setValidationError(`Value for "${key}" must be an array`);
          }
        });

        if (valid) {
          setValidationError(null);
        }

        return valid;
      } catch (error) {
        setValidationError(`JSON Error: ${error instanceof Error ? error.message : "Invalid format"}`);
        return false;
      }
    },
    message: "Format must be valid JSON.",
  };

  return (
    <section>
      <SubTitle title="CRD Group" />
      <Input
        theme="round-black"
        placeholder='{ "KEDA": [{ "Eventing": ["eventing.keda.sh"] }, "keda.sh"], "linkerd.io": ["policy.linkerd.io", "linkerd.io"] }'
        value={crdGroup}
        onChange={(v) => setCrdGroup(v)}
        multiLine={true}
        rows={20}
        onBlur={() => (state.crdGroup = crdGroup)}
        validators={[jsonValidator]}
      />
      <button
        type="button"
        style={{
          margin: "8px 0",
          padding: "4px 12px",
          borderRadius: 4,
          border: "1px solid #444",
          background: "#222",
          color: "#fff",
          cursor: "pointer",
        }}
        onClick={() => {
          try {
            const formatted = JSON.stringify(JSON.parse(crdGroup), null, 2);
            setCrdGroup(formatted);
            setValidationError(null);
          } catch (error) {
            setValidationError(`Formatting failed: ${error instanceof Error ? error.message : "Invalid JSON"}`);
          }
        }}
      >
        Format JSON
      </button>
      <small className="hint">{hint}</small>
      {validationError && <div style={{ color: "red", marginTop: "8px" }}>{validationError}</div>}
    </section>
  );
});

export const CrdGroup = withInjectables<Dependencies, {}>(NonInjectedCrdGroup, {
  getProps: (di): Dependencies => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
