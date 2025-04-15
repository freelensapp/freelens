/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./main-layout.module.scss";

import { ErrorBoundary } from "@freelensapp/error-boundary";
import { ResizeDirection, ResizeGrowthDirection, ResizeSide, ResizingAnchor } from "@freelensapp/resizing-anchor";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import type { StorageLayer } from "../../utils/storage-helper";
import type { SidebarStorageState } from "./sidebar-storage/sidebar-storage.injectable";
import sidebarStorageInjectable, { defaultSidebarWidth } from "./sidebar-storage/sidebar-storage.injectable";

export interface MainLayoutProps {
  sidebar: StrictReactNode;
  className?: string;
  footer?: StrictReactNode;
  children?: StrictReactNode;
}

/**
 * Main layout is commonly used as a wrapper for "global pages"
 *
 * @link https://api-docs.k8slens.dev/master/extensions/capabilities/common-capabilities/#global-pages
 */

interface Dependencies {
  sidebarStorage: StorageLayer<SidebarStorageState>;
}

@observer
class NonInjectedMainLayout extends React.Component<MainLayoutProps & Dependencies> {
  onSidebarResize = (width: number) => {
    this.props.sidebarStorage.merge({ width });
  };

  render() {
    const { className, footer, children, sidebar } = this.props;
    const { width: sidebarWidth } = this.props.sidebarStorage.get();
    const style = { "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties;

    return (
      <div className={cssNames(styles.mainLayout, className)} style={style}>
        <div className={styles.sidebar}>
          {sidebar}
          <ResizingAnchor
            direction={ResizeDirection.HORIZONTAL}
            placement={ResizeSide.TRAILING}
            growthDirection={ResizeGrowthDirection.LEFT_TO_RIGHT}
            getCurrentExtent={() => sidebarWidth}
            onDrag={this.onSidebarResize}
            onDoubleClick={() => this.onSidebarResize(defaultSidebarWidth)}
            minExtent={150}
            maxExtent={400}
          />
        </div>

        <div className={styles.contents}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>

        <div className={styles.footer}>{footer}</div>
      </div>
    );
  }
}

export const MainLayout = withInjectables<Dependencies, MainLayoutProps>(NonInjectedMainLayout, {
  getProps: (di, props) => ({
    ...props,
    sidebarStorage: di.inject(sidebarStorageInjectable),
  }),
});
