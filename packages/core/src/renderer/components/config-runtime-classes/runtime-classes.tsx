/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./runtime-classes.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { observer } from "mobx-react";
import * as React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { WithTooltip } from "../with-tooltip";
import runtimeClassStoreInjectable from "./store.injectable";

import type { RuntimeClass } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { RuntimeClassStore } from "./store";

enum columnId {
  name = "name",
  handler = "handler",
  age = "age",
}

export interface RuntimeClassesProps extends KubeObjectDetailsProps<RuntimeClass> {}

interface Dependencies {
  runtimeClassStore: RuntimeClassStore;
}

@observer
class NonInjectedRuntimeClasses extends React.Component<RuntimeClassesProps & Dependencies> {
  constructor(props: RuntimeClassesProps & Dependencies) {
    super(props);
    autoBindReact(this);
  }

  render() {
    const { runtimeClassStore } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="configuration_runtime_classes"
          className="RuntimeClasses"
          store={runtimeClassStore}
          sortingCallbacks={{
            [columnId.name]: (rc) => rc.getName(),
            [columnId.handler]: (rc) => rc.getHandler(),
            [columnId.age]: (rc) => -rc.getCreationTimestamp(),
          }}
          searchFilters={[(rc) => rc.getSearchFields()]}
          renderHeaderTitle="Runtime Classes"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Handler", className: "handler", sortBy: columnId.handler, id: columnId.handler },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(rc) => [
            <WithTooltip>{rc.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={rc} />,
            <WithTooltip>{rc.getHandler()}</WithTooltip>,
            <KubeObjectAge key="age" object={rc} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const RuntimeClasses = withInjectables<Dependencies, RuntimeClassesProps>(NonInjectedRuntimeClasses, {
  getProps: (di, props) => ({
    ...props,
    runtimeClassStore: di.inject(runtimeClassStoreInjectable),
  }),
});
