/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import { ReferenceGrantColumnId, referenceGrantTableHeaders } from "./gateway-api-list-helpers";
import referenceGrantStoreInjectable from "./reference-grant-store.injectable";

import type { ReferenceGrant } from "@freelensapp/kube-object";

import type { ReferenceGrantStore } from "./reference-grant-store";

interface Dependencies {
  referenceGrantStore: ReferenceGrantStore;
}

const NonInjectedReferenceGrants = observer((props: Dependencies) => {
  const { referenceGrantStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_reference_grants"
        className="ReferenceGrants"
        store={referenceGrantStore}
        sortingCallbacks={{
          [ReferenceGrantColumnId.name]: (item: ReferenceGrant) => item.getName(),
          [ReferenceGrantColumnId.namespace]: (item: ReferenceGrant) => item.getNs(),
          [ReferenceGrantColumnId.age]: (item: ReferenceGrant) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item: ReferenceGrant) => item.getSearchFields()]}
        renderHeaderTitle="Reference Grants"
        renderTableHeader={referenceGrantTableHeaders}
        renderTableContents={(item: ReferenceGrant) => {
          const fromRefs = item.getFrom();
          const toRefs = item.getTo();
          const fromLabel = fromRefs.length > 0 ? fromRefs.map((f) => f.kind).join(", ") : "-";
          const toLabel = toRefs.length > 0 ? toRefs.map((t) => t.kind).join(", ") : "-";

          return [
            <WithTooltip>{item.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
            fromLabel === "-" ? "-" : <WithTooltip>{fromLabel}</WithTooltip>,
            toLabel === "-" ? "-" : <WithTooltip>{toLabel}</WithTooltip>,
            <KubeObjectAge key="age" object={item} />,
          ];
        }}
      />
    </SiblingsInTabLayout>
  );
});

export const ReferenceGrants = withInjectables<Dependencies>(NonInjectedReferenceGrants, {
  getProps: (di, props) => ({
    ...props,
    referenceGrantStore: di.inject(referenceGrantStoreInjectable),
  }),
});
