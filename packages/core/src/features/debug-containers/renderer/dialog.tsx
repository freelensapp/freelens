/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { Dialog } from "../../../renderer/components/dialog";
import { Input } from "../../../renderer/components/input";
import { MonacoEditor } from "../../../renderer/components/monaco-editor";
import { Select } from "../../../renderer/components/select";
import { Wizard, WizardStep } from "../../../renderer/components/wizard";
import { debugProfiles } from "../common/debug-container";
import debugContainerDialogStateInjectable from "./dialog-state.injectable";

import type { DebugContainerDialogState } from "./dialog-state";

interface YamlEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

// The wizard submits its step on an Enter that no field has handled, and the editor does not mark
// the Enter that adds a line as handled.
const YamlEditor = ({ id, value, onChange, height = 80 }: YamlEditorProps) => (
  <div
    onKeyDown={(event) => {
      if (event.key === "Enter") event.stopPropagation();
    }}
  >
    <MonacoEditor
      id={id}
      language="yaml"
      style={{
        height,
        resize: "vertical",
        overflow: "hidden",
        border: "1px solid var(--borderFaintColor)",
        borderRadius: "4px",
      }}
      options={{ lineNumbers: "off", minimap: { enabled: false }, scrollBeyondLastLine: false }}
      value={value}
      onChange={onChange}
    />
  </div>
);

const profileOptions = [
  { value: "" as const, label: "kubectl default" },
  ...debugProfiles.map((profile) => ({ value: profile, label: profile })),
];

export const DebugContainerDialogContent = observer(({ state }: { state: DebugContainerDialogState }) => (
  <Wizard header={<h5>Debug {state.pod?.getName()}</h5>} done={state.close}>
    <WizardStep
      contentClass="flex flex-col gap-4"
      nextLabel="Start debugging"
      next={state.start}
      disabledNext={Boolean(state.error)}
    >
      <label htmlFor="debug-target">Target container</label>
      <Select
        id="debug-target"
        inputId="debug-target"
        aria-label="Target container"
        options={state.pod?.getContainers().map(({ name }) => ({ value: name, label: name })) ?? []}
        value={state.target}
        onChange={(option) => {
          state.set("target", option?.value ?? "");
        }}
      />
      <label htmlFor="debug-image">Image</label>
      <Input
        id="debug-image"
        aria-label="Image"
        value={state.image}
        required
        onChange={(value) => {
          state.set("image", value);
        }}
      />
      <label htmlFor="debug-profile">Profile</label>
      <Select
        id="debug-profile"
        inputId="debug-profile"
        aria-label="Profile"
        options={profileOptions}
        value={state.profile}
        onChange={(option) => {
          state.set("profile", option?.value ?? "");
        }}
      />
      <span>Environment variables</span>
      <YamlEditor id="debug-container-env" value={state.env} onChange={(value) => state.set("env", value)} />
      <span>Custom container spec</span>
      <YamlEditor
        id="debug-container-custom"
        value={state.custom}
        onChange={(value) => state.set("custom", value)}
        height={140}
      />
      <p>
        Runs <code>kubectl debug</code> in a new terminal tab. The ephemeral container stays in the pod until the pod is
        deleted. While it runs, Attach in its details connects to it again.
      </p>
      {state.error && <p role="status">{state.error}</p>}
    </WizardStep>
  </Wizard>
));

export const DebugContainerDialog = withInjectables<{ state: DebugContainerDialogState }>(
  observer(({ state }) => (
    <Dialog isOpen={Boolean(state.pod)} close={state.close}>
      {state.pod && <DebugContainerDialogContent state={state} />}
    </Dialog>
  )),
  {
    getProps: (di, props) => ({ ...props, state: di.inject(debugContainerDialogStateInjectable) }),
  },
);
