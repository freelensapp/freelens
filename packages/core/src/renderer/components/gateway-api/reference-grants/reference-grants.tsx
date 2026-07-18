/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../../kube-object/age";
import { KubeObjectListLayout } from "../../kube-object-list-layout";
import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../../namespaces/namespace-select-badge";
import { WithTooltip } from "../../with-tooltip";
import referenceGrantStoreInjectable from "./reference-grant-store.injectable";

import type { ReferenceGrant } from "@freelensapp/kube-object";

import type { ReferenceGrantStore } from "./reference-grant-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  from = "from",
  to = "to",
  age = "age",
}

interface Dependencies {
  store: ReferenceGrantStore;
}

const NonInjectedReferenceGrants = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_reference_grants"
        className="ReferenceGrants"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: ReferenceGrant) => item.getName(),
          [columnId.namespace]: (item: ReferenceGrant) => item.getNs(),
          [columnId.age]: (item: ReferenceGrant) => -item.getCreationTimestamp(),
        }}
        searchFilters={[
          (item: ReferenceGrant) => item.getSearchFields(),
          (item: ReferenceGrant) =>
            item
              .getFrom()
              .map((f) => `${f.group}/${f.kind}/${f.namespace}`)
              .join(" "),
          (item: ReferenceGrant) =>
            item
              .getTo()
              .map((t) => `${t.group ?? ""}/${t.kind}`)
              .join(" "),
        ]}
        renderHeaderTitle="ReferenceGrants"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "From", className: "from", id: columnId.from },
          { title: "To", className: "to", id: columnId.to },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: ReferenceGrant) => [
          <WithTooltip key="name">{item.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
          <WithTooltip key="from">
            {item
              .getFrom()
              .map((f) => `${f.kind}.${f.group}/${f.namespace}`)
              .join(", ") || "-"}
          </WithTooltip>,
          <WithTooltip key="to">
            {item
              .getTo()
              .map((t) => `${t.kind}${t.group ? `.${t.group}` : ""}`)
              .join(", ") || "-"}
          </WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const ReferenceGrants = withInjectables<Dependencies>(NonInjectedReferenceGrants, {
  getProps: (di, props) => ({ ...props, store: di.inject(referenceGrantStoreInjectable) }),
});
