/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./tab-layout.scss";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";
import { ErrorBoundary } from "@freelensapp/error-boundary";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import React from "react";
import { Tab, Tabs } from "../tabs";

export interface TabLayoutProps {
  tabs?: SidebarItemDeclaration[];
  children?: StrictReactNode;
  scrollable?: boolean;
}

export const TabLayout = observer(({ tabs = [], scrollable, children }: TabLayoutProps) => {
  const hasTabs = tabs.length > 0;

  return (
    <div className={cssNames("TabLayout")} data-testid="tab-layout">
      {hasTabs && (
        <Tabs center>
          {tabs.map(({ onClick, id, title, isActive }) => (
            <Tab
              onClick={onClick}
              key={id}
              label={title}
              active={isActive.get()}
              data-is-active-test={isActive.get()}
              data-testid={`tab-link-for-${id}`}
              value={undefined}
            />
          ))}
        </Tabs>
      )}

      <main className={cssNames({ scrollable })}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
});
