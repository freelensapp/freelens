/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import openConfirmDialogInjectable from "../../../renderer/components/confirm-dialog/open.injectable";
import createTerminalTabInjectable from "../../../renderer/components/dock/terminal/create-terminal-tab.injectable";
import { debugPodReference, isManagedDebugContainer } from "../common/debug-container";
import debugContainerClientInjectable from "./client.injectable";
import { errorMessage } from "./dialog-state";

import type { EphemeralContainer, Pod } from "@freelensapp/kube-object";

import type { OpenConfirmDialog } from "../../../renderer/components/confirm-dialog/open.injectable";
import type { DebugContainerReference } from "../common/debug-container";
import type { DebugContainerClient } from "./client.injectable";

interface Props {
  pod: Pod;
  container: EphemeralContainer;
}

interface Dependencies {
  client: DebugContainerClient;
  confirm: OpenConfirmDialog;
  openShell: (reference: DebugContainerReference) => void;
}

export const DebugContainerActionsContent = observer(
  ({ pod, container, client, confirm, openShell }: Props & Dependencies) => {
    const [canExec, setCanExec] = useState<boolean>();
    const [stopping, setStopping] = useState(false);
    const [error, setError] = useState("");
    const namespace = pod.getNs();
    const managed = isManagedDebugContainer(container);
    const status = pod.status?.ephemeralContainerStatuses?.find((candidate) => candidate.name === container.name);

    useEffect(() => {
      let active = true;

      setCanExec(undefined);
      if (managed)
        client.permissions(namespace).then(
          (permissions) => {
            if (active) setCanExec(permissions.exec);
          },
          (error) => {
            if (active) setError(errorMessage(error));
          },
        );
      return () => {
        active = false;
      };
    }, [client, namespace, managed]);

    if (!managed || status?.state?.terminated) return null;
    const reference = { ...debugPodReference(pod), containerName: container.name };
    const disabled = !canExec || !status?.state?.running || stopping;

    return (
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <Button label="Open debug shell" disabled={disabled} onClick={() => openShell(reference)} />
          <Button
            label={stopping ? "Stopping..." : "Stop debugging"}
            disabled={disabled}
            onClick={() =>
              confirm({
                labelOk: "Stop debugging",
                message: `Stop ${container.name}? Its terminal sessions will end. The stopped container remains listed until the pod is deleted.`,
                ok: async () => {
                  setStopping(true);
                  setError("");
                  try {
                    await client.stop(reference);
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
        {canExec === false && <p>Opening or stopping a debugger requires permission to execute commands in pods.</p>}
        {!status?.state?.running && <p>Waiting for the debug container to start. Check its status below.</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    );
  },
);

export const DebugContainerActions = withInjectables<Dependencies, Props>(DebugContainerActionsContent, {
  getProps: (di, props) => {
    const createTerminalTab = di.inject(createTerminalTabInjectable);

    return {
      ...props,
      client: di.inject(debugContainerClientInjectable),
      confirm: di.inject(openConfirmDialogInjectable),
      openShell: (reference) =>
        createTerminalTab({
          title: `Debug: ${reference.name} / ${reference.containerName}`,
          debugContainer: reference,
        }),
    };
  },
});
