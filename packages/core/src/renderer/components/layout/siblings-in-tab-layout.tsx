/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";
import type { StrictReactNode } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import siblingTabsInjectable from "../../routes/sibling-tabs.injectable";
import { TabLayout } from "./tab-layout-2";

interface SiblingTabLayoutProps {
  children: StrictReactNode;
  scrollable?: boolean;
}

interface Dependencies {
  tabs: IComputedValue<SidebarItemDeclaration[]>;
}

const NonInjectedSiblingsInTabLayout = observer(
  ({ tabs, children, ...other }: Dependencies & SiblingTabLayoutProps) => {
    const dereferencedTabs = tabs.get();

    if (dereferencedTabs.length) {
      return (
        <TabLayout tabs={dereferencedTabs} {...other}>
          {children}
        </TabLayout>
      );
    }

    return <>{children}</>;
  },
);

export const SiblingsInTabLayout = withInjectables<Dependencies, SiblingTabLayoutProps>(
  NonInjectedSiblingsInTabLayout,

  {
    getProps: (di, props) => ({
      tabs: di.inject(siblingTabsInjectable),
      ...props,
    }),
  },
);
