/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import yaml from "js-yaml";
import React from "react";
import { defaultYamlDumpOptions } from "../../../common/kube-helpers";
import { DrawerItem, DrawerParamToggler } from "../drawer";
import { MonacoEditor } from "../monaco-editor";

import type { DaemonSet, Deployment, Job, Pod, ReplicaSet, StatefulSet } from "@freelensapp/kube-object";

export interface PodDetailsAffinitiesProps {
  workload: Pod | Deployment | DaemonSet | StatefulSet | ReplicaSet | Job;
}

export class PodDetailsAffinities extends React.Component<PodDetailsAffinitiesProps> {
  render() {
    const { workload } = this.props;
    const affinitiesNum = workload.getAffinityNumber();
    const affinities = workload.getAffinity();

    if (!affinitiesNum) return null;

    return (
      <DrawerItem name="Affinities" className="PodDetailsAffinities">
        <DrawerParamToggler label={affinitiesNum}>
          <MonacoEditor readOnly style={{ height: 200 }} value={yaml.dump(affinities, defaultYamlDumpOptions)} />
        </DrawerParamToggler>
      </DrawerItem>
    );
  }
}
