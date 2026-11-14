/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import { AskAiButton } from "../../../../features/ai-tools/renderer/ask-ai-button";
import { Checkbox } from "../../checkbox";
import styles from "./controls.module.scss";
import { DownloadLogsDropdown } from "./download-logs-dropdown";

import type { LogTabViewModel } from "./logs-view-model";

export interface LogControlsProps {
  model: LogTabViewModel;
}

export const LogControls = observer(({ model }: LogControlsProps) => {
  const tabData = model.logTabData.get();

  if (!tabData) {
    return null;
  }

  const logs = model.timestampSplitLogs.get();
  const { showTimestamps, showPrevious: previous, showWordWrap } = tabData;
  const since = logs.length ? logs[0][0] : null;

  const toggleTimestamps = () => {
    model.updateLogPreferences({ showTimestamps: !showTimestamps });
  };

  const togglePrevious = () => {
    // Keep this choice per-tab; it should not become a persisted global default.
    model.updateLogTabData({ showPrevious: !previous });
    model.reloadLogs();
  };

  const toggleWordWrap = () => {
    model.updateLogPreferences({ showWordWrap: !showWordWrap });
  };

  return (
    <div className={styles.controls} data-testid="log-controls">
      <div>
        {since && (
          <span>
            Logs from <b>{new Date(since).toLocaleString()}</b>
          </span>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <Checkbox
          label="Show timestamps"
          value={showTimestamps}
          onChange={toggleTimestamps}
          className="show-timestamps"
        />
        <Checkbox label="Word wrap" value={showWordWrap} onChange={toggleWordWrap} className="show-word-wrap" />
        <Checkbox
          label="Show previous terminated container"
          value={previous}
          onChange={togglePrevious}
          className="show-previous"
        />

        <AskAiButton
          label="Ask AI about logs"
          data-testid="ask-ai-about-logs"
          getRequest={() => {
            const pod = model.pod.get();
            const visible = model.logsWithoutTimestamps.get();

            return {
              target: {
                type: "logs",
                pod: {
                  kind: "Pod",
                  apiVersion: "v1",
                  name: pod?.getName() ?? tabData.selectedPodId,
                  namespace: pod?.getNs() ?? tabData.namespace,
                },
                container: tabData.combined ? undefined : tabData.selectedContainer,
                logs: visible.length ? visible.slice(-400).join("\n") : undefined,
              },
            };
          }}
        />
        <DownloadLogsDropdown
          disabled={logs.length === 0}
          downloadVisibleLogs={model.downloadLogs}
          downloadAllLogs={model.downloadAllLogs}
        />
      </div>
    </div>
  );
});
