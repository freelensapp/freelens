/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { AskAiRequest } from "../common/ask-ai-request";

/**
 * The request the Ask AI dialog of this frame shows, or undefined when closed.
 */
const askAiDialogStateInjectable = getInjectable({
  id: "ask-ai-dialog-state",
  instantiate: () => observable.box<AskAiRequest | undefined>(undefined, { deep: false }),
});

export default askAiDialogStateInjectable;
