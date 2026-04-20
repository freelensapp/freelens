/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import React from "react";
import { Checkbox } from "../checkbox";
import { SubTitle } from "../layout/sub-title";

import type { Cluster } from "../../../common/cluster/cluster";

export interface NamespaceAuthCheckSettingProps {
  cluster: Cluster;
}

export const NamespaceAuthCheckSetting = observer(function NamespaceAuthCheckSetting({
  cluster,
}: NamespaceAuthCheckSettingProps) {
  return (
    <>
      <SubTitle title="Performance" />
      <Checkbox
        label="Skip namespace authorization check"
        value={cluster.preferences.skipNamespaceAuthorizationCheck ?? false}
        onChange={(checked) => {
          cluster.preferences.skipNamespaceAuthorizationCheck = checked;
        }}
      />
      <small className="hint">
        Skip the per-namespace authorization check when connecting to this cluster.
        Speeds up connection but may show resources you cannot access.
      </small>
    </>
  );
});
