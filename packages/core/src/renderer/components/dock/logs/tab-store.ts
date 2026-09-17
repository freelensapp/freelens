/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DockTabStore } from "../dock-tab-store/dock-tab.store";
import { logTabDataValidator } from "./log-tab-data.validator";

import type { TabId } from "../dock/store";
import type { DockTabStoreDependencies } from "../dock-tab-store/dock-tab.store";

export interface LogTabOwnerRef {
  /**
   * The uid of the owner
   */
  uid: string;
  /**
   * The name of the owner
   */
  name: string;
  /**
   * The kind of the owner
   */
  kind: string;
}

export interface LogTabData {
  /**
   * The owning workload for this logging tab
   */
  owner?: LogTabOwnerRef;

  /**
   * The uid of the currently selected pod
   */
  selectedPodId: string;

  /**
   * When set, the uids of additional pods whose logs are combined with
   * `selectedPodId`'s and shown interleaved chronologically, tagged with a
   * color-coded pod name prefix per line. Used for viewing the combined logs
   * of a workload (e.g. all pods of a Deployment) instead of a single pod.
   */
  mergedPodIds?: string[];

  /**
   * The namespace of the pods/workload
   */
  namespace: string;

  /**
   * The name of the currently selected container within the currently selected
   * pod
   */
  selectedContainer: string;

  /**
   * Whether to show timestamps in the logs
   */
  showTimestamps: boolean;

  /**
   * Whether to show the logs of the previous container instance
   */
  showPrevious: boolean;

  /**
   * Whether to wrap long log lines
   */
  showWordWrap: boolean;
}

export class LogTabStore extends DockTabStore<LogTabData> {
  constructor(dependencies: DockTabStoreDependencies) {
    super(dependencies, {
      storageKey: "pod_logs",
    });
  }

  /**
   * Returns true if the data for `tabId` is valid
   */
  isDataValid(tabId: TabId): boolean {
    if (!this.getData(tabId)) {
      return true;
    }

    return !logTabDataValidator.validate(this.getData(tabId)).error;
  }
}
