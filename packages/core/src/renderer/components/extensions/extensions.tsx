/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./extensions.module.scss";
import React from "react";
import { DropFileInput } from "../input";
import { ExtensionInstall } from "./install";
import { InstalledExtensions } from "./installed-extensions";
import { Notice } from "./notice";
import { SettingLayout } from "../layout/setting-layout";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { InstallOnDrop } from "./install-on-drop.injectable";
import installOnDropInjectable from "./install-on-drop.injectable";
import Gutter from "../gutter/gutter";

const ExtensionsNotice = () => (
  <Notice className={styles.notice}>
    <p>{"Add new features via Freelens Extensions."}</p>
    <p>
      We recommend
      <b>{" @freelensapp/freelens-node-pod-menu "}</b>
      which adds back the node and pod menu functionality.
    </p>
  </Notice>
);

interface Dependencies {
  installOnDrop: InstallOnDrop;
}

const NonInjectedExtensions = ({ installOnDrop }: Dependencies) => (
  <DropFileInput onDropFiles={installOnDrop}>
    <SettingLayout
      className="Extensions"
      contentGaps={false}
      data-testid="extensions-page"
    >
      <section>
        <h1>Extensions</h1>
        <ExtensionsNotice />
        <ExtensionInstall />
        <Gutter size="md" />
        <InstalledExtensions />
      </section>
    </SettingLayout>
  </DropFileInput>
);

export const Extensions = withInjectables<Dependencies>(NonInjectedExtensions, {
  getProps: (di) => ({
    installOnDrop: di.inject(installOnDropInjectable),
  }),
});
