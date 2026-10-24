/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { Input, InputValidators } from "../../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../../renderer/components/select";
import {
  customPackageMirror,
  defaultPackageMirror,
  packageMirrors,
} from "../../../../../../user-preferences/common/preferences-helpers";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const downloadMirrorOptions = Array.from(packageMirrors, ([name, mirror]) => ({
  value: name,
  label: mirror.label,

  // TODO: Side-effect
  isDisabled: !mirror.platforms.has(process.platform),
}));

const NonInjectedKubectlDownloadMirror = observer(({ state }: Dependencies) => (
  <section>
    <SubTitle title="Download mirror" />
    <Select
      id="download-mirror-input"
      placeholder="Download mirror for kubectl"
      options={downloadMirrorOptions}
      value={state.downloadMirror}
      onChange={(option) => (state.downloadMirror = option?.value ?? defaultPackageMirror)}
      isDisabled={!state.downloadKubectlBinaries}
      themeName="lens"
    />
    {state.downloadMirror === customPackageMirror && (
      <div style={{ marginTop: 16 }}>
        <SubTitle title="Custom mirror URL" />
        <Input
          theme="round-black"
          type="url"
          placeholder="https://artifacts.example.com/kubernetes/kubectl"
          value={state.downloadCustomMirror}
          validators={InputValidators.isUrl}
          onChange={(value) => (state.downloadCustomMirror = value)}
          disabled={!state.downloadKubectlBinaries}
        />
        <div className="hint">{"The base URL of your mirror. Freelens fills in the version and platform path."}</div>
      </div>
    )}
  </section>
));

export const KubectlDownloadMirror = withInjectables<Dependencies>(NonInjectedKubectlDownloadMirror, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
