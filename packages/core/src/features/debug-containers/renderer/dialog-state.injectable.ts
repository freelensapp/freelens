/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podApiInjectable } from "@freelensapp/kube-api-specifics";
import { getInjectable } from "@ogre-tools/injectable";
import { v4 as uuid } from "uuid";
import createTerminalTabInjectable from "../../../renderer/components/dock/terminal/create-terminal-tab.injectable";
import debugContainerClientInjectable from "./client.injectable";
import { DebugContainerDialogState } from "./dialog-state";

const debugContainerDialogStateInjectable = getInjectable({
  id: "debug-container-dialog-state",
  instantiate: (di) => {
    const createTerminalTab = di.inject(createTerminalTabInjectable);

    return new DebugContainerDialogState({
      client: di.inject(debugContainerClientInjectable),
      podApi: di.inject(podApiInjectable),
      randomId: uuid,
      delay: () => new Promise((resolve) => setTimeout(resolve, 1000)),
      openShell: (reference) =>
        createTerminalTab({
          title: `Debug: ${reference.name} / ${reference.containerName}`,
          debugContainer: reference,
        }),
    });
  },
});

export default debugContainerDialogStateInjectable;
