/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useState } from "react";
import apiBaseInjectable from "../../../common/k8s-api/api-base.injectable";
import openConfirmDialogInjectable from "../../../renderer/components/confirm-dialog/open.injectable";
import debugContainerDialogStateInjectable from "./dialog-state.injectable";

import type { EphemeralContainer, Pod } from "@freelensapp/kube-object";

import type { OpenConfirmDialog } from "../../../renderer/components/confirm-dialog/open.injectable";
import type { DebugContainerReference } from "../common/debug-container";

interface Props {
  pod: Pod;
  container: EphemeralContainer;
}

interface Dependencies {
  attach: (pod: Pod, container: EphemeralContainer) => void;
  stop: (reference: DebugContainerReference) => Promise<unknown>;
  confirm: OpenConfirmDialog;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);

export const DebugContainerActionsContent = observer(
  ({ pod, container, attach, stop, confirm }: Props & Dependencies) => {
    const [stopping, setStopping] = useState(false);
    const [error, setError] = useState("");
    const status = pod.status?.ephemeralContainerStatuses?.find(({ name }) => name === container.name);

    if (!status?.state?.running) return null;

    return (
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <Button label="Attach" disabled={stopping} onClick={() => attach(pod, container)} />
          <Button
            label={stopping ? "Stopping..." : "Stop"}
            disabled={stopping}
            onClick={() =>
              confirm({
                labelOk: "Stop",
                message: `Stop ${container.name}? Its terminal sessions end, and the stopped container stays listed until the pod is deleted. Stopping needs sh, readlink and kill in its image.`,
                ok: async () => {
                  setStopping(true);
                  setError("");
                  try {
                    await stop({ namespace: pod.getNs(), pod: pod.getName(), container: container.name });
                  } catch (error) {
                    setError(errorMessage(error));
                  } finally {
                    setStopping(false);
                  }
                },
              })
            }
          />
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  },
);

export const DebugContainerActions = withInjectables<Dependencies, Props>(DebugContainerActionsContent, {
  getProps: (di, props) => {
    const apiBase = di.inject(apiBaseInjectable);
    const dialogState = di.inject(debugContainerDialogStateInjectable);

    return {
      ...props,
      attach: dialogState.attach,
      stop: (reference) => apiBase.post("/debug-containers/stop", { data: reference }),
      confirm: di.inject(openConfirmDialogInjectable),
    };
  },
});
