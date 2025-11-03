/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./licenses.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { SettingLayout } from "../../../renderer/components/layout/setting-layout";
import closeLicensesInjectable from "./close-licenses.injectable";
import licenseContentInjectable from "./license-content.injectable";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";

interface Dependencies {
  closeLicenses: () => void;
  licenseContent: IAsyncComputed<string>;
}

const NonInjectedLicenses = observer(({ closeLicenses, licenseContent }: Dependencies) => {
  const content = licenseContent.value.get();

  return (
    <SettingLayout
      className="Licenses"
      contentGaps={false}
      closeButtonProps={{ "data-testid": "close-licenses" }}
      back={closeLicenses}
    >
      <div className="licenses-content">
        <pre>{content}</pre>
      </div>
    </SettingLayout>
  );
});

export const Licenses = withInjectables<Dependencies>(NonInjectedLicenses, {
  getProps: (di, props) => ({
    closeLicenses: di.inject(closeLicensesInjectable),
    licenseContent: di.inject(licenseContentInjectable),
    ...props,
  }),
});
