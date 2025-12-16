/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import React, { useState } from "react";
import { Gutter } from "../gutter";
import { DropFileInput } from "../input";
import { SettingLayout } from "../layout/setting-layout";
import styles from "./extensions.module.scss";
import { ExtensionInstall } from "./install";
import installOnDropInjectable from "./install-on-drop.injectable";
import { InstalledExtensions } from "./installed-extensions";
import { MarketplaceExtensions } from "./marketplace-extensions";
import { Notice } from "./notice";

import type { InstallOnDrop } from "./install-on-drop.injectable";

const ExtensionsNotice = () => (
  <Notice className={styles.notice}>
    <p>{"Add new features via Freelens Extensions."}</p>
  </Notice>
);

interface ExtensionTabsProps {
  activeTab: "installed" | "marketplace";
  onTabChange: (tab: "installed" | "marketplace") => void;
}

const ExtensionTabs = ({ activeTab, onTabChange }: ExtensionTabsProps) => (
  <div
    style={{
      display: "flex",
      gap: "2rem",
      borderBottom: "1px solid var(--borderColor)",
      marginBottom: "1.5rem",
    }}
  >
    <button
      onClick={() => onTabChange("installed")}
      style={{
        padding: "0.75rem 0",
        background: "none",
        border: "none",
        color: activeTab === "installed" ? "var(--textColorPrimary)" : "var(--textColorSecondary)",
        fontSize: "1rem",
        fontWeight: 500,
        cursor: "pointer",
        borderBottom: activeTab === "installed" ? "2px solid #00d4aa" : "2px solid transparent",
        marginBottom: "-1px",
      }}
    >
      Installed
    </button>
    <button
      onClick={() => onTabChange("marketplace")}
      style={{
        padding: "0.75rem 0",
        background: "none",
        border: "none",
        color: activeTab === "marketplace" ? "var(--textColorPrimary)" : "var(--textColorSecondary)",
        fontSize: "1rem",
        fontWeight: 500,
        cursor: "pointer",
        borderBottom: activeTab === "marketplace" ? "2px solid #00d4aa" : "2px solid transparent",
        marginBottom: "-1px",
      }}
    >
      Marketplace
    </button>
  </div>
);

interface Dependencies {
  installOnDrop: InstallOnDrop;
}

const NonInjectedExtensions = ({ installOnDrop }: Dependencies) => {
  const [activeTab, setActiveTab] = useState<"installed" | "marketplace">("installed");

  return (
    <DropFileInput onDropFiles={installOnDrop}>
      <SettingLayout className="Extensions" contentGaps={false} data-testid="extensions-page">
        <section>
          <h1>Extensions</h1>
          <ExtensionsNotice />
          <ExtensionInstall />
          <Gutter size="md" />

          <ExtensionTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === "installed" ? <InstalledExtensions /> : <MarketplaceExtensions />}
        </section>
      </SettingLayout>
    </DropFileInput>
  );
};

export const Extensions = withInjectables<Dependencies>(NonInjectedExtensions, {
  getProps: (di) => ({
    installOnDrop: di.inject(installOnDropInjectable),
  }),
});
