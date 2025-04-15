/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { createRef, useEffect } from "react";
import type { SubscribeStores } from "../../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../../kube-watch-api/subscribe-stores.injectable";
import type { PodStore } from "../../workloads-pods/store";
import podStoreInjectable from "../../workloads-pods/store.injectable";
import type { DockTab } from "../dock/store";
import { InfoPanel } from "../info-panel";
import { LogControls } from "./controls";
import type { LogListRef } from "./list";
import { LogList } from "./list";
import type { LogTabViewModel } from "./logs-view-model";
import logsViewModelInjectable from "./logs-view-model.injectable";
import { LogResourceSelector } from "./resource-selector";
import { LogSearch } from "./search";

export interface LogsDockTabProps {
  className?: string;
  tab: DockTab;
}

interface Dependencies {
  model: LogTabViewModel;
  subscribeStores: SubscribeStores;
  podStore: PodStore;
}

const NonInjectedLogsDockTab = observer(
  ({ className, tab, model, subscribeStores, podStore }: Dependencies & LogsDockTabProps) => {
    const logListElement = createRef<LogListRef>();
    const data = model.logTabData.get();

    useEffect(() => {
      model.reloadLogs();

      return model.stopLoadingLogs;
    }, [tab.id]);
    useEffect(
      () =>
        subscribeStores([podStore], {
          namespaces: data ? [data.namespace] : [],
        }),
      [data?.namespace],
    );

    const scrollToOverlay = (overlayLine: number | undefined) => {
      if (!logListElement.current || overlayLine === undefined) {
        return;
      }

      // Scroll vertically
      logListElement.current.scrollToItem(overlayLine, "center");
      // Scroll horizontally in timeout since virtual list need some time to prepare its contents
      setTimeout(() => {
        const overlay = document.querySelector(".PodLogs .list span.active");

        if (!overlay) return;
        // Note: .scrollIntoViewIfNeeded() is non-standard and thus not present in js-dom.
        overlay?.scrollIntoViewIfNeeded?.();
      }, 100);
    };

    if (!data) {
      return null;
    }

    return (
      <div className={cssNames("PodLogs flex column", className)}>
        <InfoPanel
          tabId={tab.id}
          controls={
            <div className="flex gaps">
              <LogResourceSelector model={model} />
              <LogSearch model={model} scrollToOverlay={scrollToOverlay} />
            </div>
          }
          showSubmitClose={false}
          showButtons={false}
          showStatusPanel={false}
        />
        <LogList model={model} ref={logListElement} />
        <LogControls model={model} />
      </div>
    );
  },
);

export const LogsDockTab = withInjectables<Dependencies, LogsDockTabProps>(NonInjectedLogsDockTab, {
  getProps: (di, props) => ({
    ...props,
    model: di.inject(logsViewModelInjectable, props.tab.id),
    subscribeStores: di.inject(subscribeStoresInjectable),
    podStore: di.inject(podStoreInjectable),
  }),
});
