/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { Dialog } from "../../../renderer/components/dialog";
import { Input } from "../../../renderer/components/input";
import { Select } from "../../../renderer/components/select";
import { Wizard, WizardStep } from "../../../renderer/components/wizard";
import debugContainerDialogStateInjectable from "./dialog-state.injectable";

import type { DebugContainerDialogState } from "./dialog-state";

export const DebugContainerDialogContent = observer(({ state }: { state: DebugContainerDialogState }) => (
  <Wizard header={<h5>Debug {state.pod?.getName()}</h5>} done={state.close}>
    <WizardStep
      contentClass="flex flex-col gap-4"
      nextLabel={state.submitted ? "Retry connection" : "Start debugging"}
      next={state.start}
      disabledNext={state.busy || Boolean(state.disabledReason)}
      waiting={state.busy}
    >
      <label htmlFor="debug-target">Target container</label>
      <Select
        id="debug-target"
        inputId="debug-target"
        aria-label="Target container"
        options={state.pod?.getContainers().map(({ name }) => ({ value: name, label: name })) ?? []}
        value={state.targetContainerName}
        onChange={(option) => {
          state.setTargetContainer(option?.value ?? "");
        }}
        isDisabled={state.submitted}
      />
      <label htmlFor="debug-image">Debug image</label>
      <Input
        id="debug-image"
        aria-label="Debug image"
        value={state.image}
        required
        trim
        disabled={state.submitted}
        onChange={(value) => {
          state.setImage(value);
        }}
      />
      <p>The debug image needs sh, sleep, and a writable /tmp. It runs without privileged mode.</p>
      <p>Closing the terminal leaves the debug container running. Stop it from Ephemeral Containers when finished.</p>
      <p>Stopped containers remain listed until the pod is deleted. Added containers cannot be edited.</p>
      {state.disabledReason && <p role="status">{state.disabledReason}</p>}
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
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
