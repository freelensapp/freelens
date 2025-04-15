/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./namespace-select.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { computed } from "mobx";
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import type { ClusterContext } from "../../cluster-frame-context/cluster-frame-context";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import type { SelectProps } from "../select";
import { Select } from "../select";

export type NamespaceSelectSort = (left: string, right: string) => number;

export interface NamespaceSelectProps<IsMulti extends boolean>
  extends Omit<SelectProps<string, { value: string; label: string }, IsMulti>, "options" | "value"> {
  showIcons?: boolean;
  sort?: NamespaceSelectSort;
  value: string | null | undefined;
}

interface Dependencies {
  context: ClusterContext;
}

function getOptions(context: ClusterContext, sort: NamespaceSelectSort | undefined) {
  return computed(() => {
    const baseOptions = context.allNamespaces;

    if (sort) {
      baseOptions.sort(sort);
    }

    return baseOptions.map((namespace) => ({
      value: namespace,
      label: namespace,
    }));
  });
}

const NonInjectedNamespaceSelect = observer(
  ({
    context,
    showIcons,
    formatOptionLabel,
    sort,
    className,
    ...selectProps
  }: Dependencies & NamespaceSelectProps<boolean>) => {
    const [baseOptions, setBaseOptions] = useState(getOptions(context, sort));

    useEffect(() => setBaseOptions(getOptions(context, sort)), [sort]);

    return (
      <Select
        className={cssNames("NamespaceSelect", className)}
        menuClass="NamespaceSelectMenu"
        formatOptionLabel={
          showIcons
            ? ({ value }) => (
                <>
                  <Icon small material="layers" />
                  {value}
                </>
              )
            : undefined
        }
        options={baseOptions.get()}
        {...selectProps}
      />
    );
  },
);

const InjectedNamespaceSelect = withInjectables<Dependencies, NamespaceSelectProps<boolean>>(
  NonInjectedNamespaceSelect,
  {
    getProps: (di, props) => ({
      ...props,
      context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
    }),
  },
);

export function NamespaceSelect<IsMulti extends boolean = false>(props: NamespaceSelectProps<IsMulti>): JSX.Element {
  return <InjectedNamespaceSelect {...(props as unknown as NamespaceSelectProps<boolean>)} />;
}
