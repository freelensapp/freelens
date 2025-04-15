/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { CronJob } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

const cronJobTriggerDialogStateInjectable = getInjectable({
  id: "cron-job-trigger-dialog-state",
  instantiate: () => observable.box<CronJob>(),
});

export default cronJobTriggerDialogStateInjectable;
