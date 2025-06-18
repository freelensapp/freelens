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
import React from "react";
import Gutter from "../gutter/gutter";
import { DropFileInput } from "../input";
import { SettingLayout } from "../layout/setting-layout";
import styles from "./extensions.module.scss";
import { ExtensionInstall } from "./install";
import installOnDropInjectable from "./install-on-drop.injectable";
import { InstalledExtensions } from "./installed-extensions";
import { Notice } from "./notice";

import type { InstallOnDrop } from "./install-on-drop.injectable";

const ExtensionsNotice = () => (
  <Notice className={styles.notice}>
    <p>{"Add new features via Freelens Extensions."}</p>
  </Notice>
);

interface Dependencies {
  installOnDrop: InstallOnDrop;
}

const NonInjectedExtensions = ({ installOnDrop }: Dependencies) => (
  <DropFileInput onDropFiles={installOnDrop}>
    <SettingLayout className="Extensions" contentGaps={false} data-testid="extensions-page">
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
