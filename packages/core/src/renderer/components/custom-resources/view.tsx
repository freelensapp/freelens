/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./view.scss";

import { formatJSONValue, safeJSONPathValue } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { startCase } from "es-toolkit";
import { observer } from "mobx-react";
import React from "react";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import customResourceDefinitionStoreInjectable from "../custom-resource-definitions/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { TabLayout } from "../layout/tab-layout-2";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import discoveredCustomResourcesInjectable, {
  getDiscoveredApiBase,
  inPreferredVersions,
} from "./discovered-custom-resources.injectable";
import customResourcesRouteParametersInjectable from "./route-parameters.injectable";

import type { AdditionalPrinterColumnsV1 } from "@freelensapp/kube-object";
import type { TableCellProps } from "@freelensapp/list-layout";

import type { IComputedValue } from "mobx";

import type { ApiManager } from "../../../common/k8s-api/api-manager";
import type { KubeApiResource } from "../../../common/rbac";
import type { CustomResourceDefinitionStore } from "../custom-resource-definitions/store";

enum columnId {
  name = "name",
  namespace = "namespace",
  age = "age",
}

interface Dependencies {
  group: IComputedValue<string>;
  name: IComputedValue<string>;
  apiManager: ApiManager;
  customResourceDefinitionStore: CustomResourceDefinitionStore;
  discoveredCustomResources: IComputedValue<KubeApiResource[]>;
}

// What the list needs of a custom resource, from its definition or, for a user
// who may not list the definitions, from the discovery of the cluster.
interface ListedCustomResource {
  group: string;
  kind: string;
  pluralName: string;
  isNamespaced: boolean;
  apiBase: string;
  extraColumns: AdditionalPrinterColumnsV1[];
  unservedVersion?: string;
}

@observer
class NonInjectedCustomResources extends React.Component<Dependencies> {
  constructor(props: Dependencies) {
    super(props);
  }

  // A plain getter (not @computed): it reads this.props, which mobx-react 9
  // forbids inside a derivation. Read from render, reactivity is preserved by
  // the observer render reaction.
  get resource(): ListedCustomResource | undefined {
    const group = this.props.group.get();
    const name = this.props.name.get();
    const crd = this.props.customResourceDefinitionStore.getByGroup(group, name);

    if (crd) {
      const version = crd.getPreferredVersion();

      return {
        group: crd.getGroup(),
        kind: crd.getResourceKind(),
        pluralName: crd.getPluralName(),
        isNamespaced: crd.isNamespaced(),
        apiBase: crd.getResourceApiBase(),
        extraColumns: crd.getPrinterColumns(false), // Cols with priority bigger than 0 are shown in details
        unservedVersion: version.served ? undefined : version.name,
      };
    }

    // Discovery has no printer columns, so a discovered custom resource gets
    // the default ones only.
    const discovered = inPreferredVersions(this.props.discoveredCustomResources.get()).find(
      (resource) => resource.group === group && resource.apiName === name,
    );

    if (discovered) {
      return {
        group: discovered.group,
        kind: discovered.kind,
        pluralName: discovered.apiName,
        isNamespaced: discovered.namespaced,
        apiBase: getDiscoveredApiBase(discovered),
        extraColumns: [],
      };
    }

    return undefined;
  }

  render() {
    const { resource } = this;
    const store = this.props.apiManager.getStore(resource?.apiBase);

    if (!resource || !store) {
      return null;
    }

    const { isNamespaced, extraColumns } = resource;

    return (
      <TabLayout>
        <KubeObjectListLayout
          isConfigurable
          key={`crd_resources_${resource.apiBase}`}
          tableId={`crd_resources_${resource.apiBase}`}
          className="CustomResources"
          store={store}
          sortingCallbacks={{
            [columnId.name]: (customResource) => customResource.getName(),
            [columnId.namespace]: (customResource) => customResource.getNs(),
            [columnId.age]: (customResource) => -customResource.getCreationTimestamp(),
            ...Object.fromEntries(
              extraColumns.map(({ name, jsonPath }) => [
                name,
                (customResource) => formatJSONValue(safeJSONPathValue(customResource, jsonPath)),
              ]),
            ),
          }}
          searchFilters={[(customResource) => customResource.getSearchFields()]}
          renderHeaderTitle={resource.kind}
          customizeHeader={({ searchProps, ...headerPlaceholders }) => ({
            searchProps: {
              ...searchProps,
              placeholder: `${resource.kind} search ...`,
            },
            ...headerPlaceholders,
          })}
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            isNamespaced
              ? { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace }
              : undefined,
            ...extraColumns.map(({ name }) => ({
              title: startCase(name),
              className: name.toLowerCase().replace(/\s+/g, "-"),
              sortBy: name,
              id: name,
              "data-testid": `custom-resource-column-title-${name.toLowerCase().replace(/\s+/g, "-")}`,
            })),
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(customResource) => [
            <WithTooltip>{customResource.getName()}</WithTooltip>,
            isNamespaced && <NamespaceSelectBadge namespace={customResource.getNs() as string} />,
            ...extraColumns.map(
              (column): TableCellProps => ({
                "data-testid": `custom-resource-column-cell-${column.name.toLowerCase().replace(/\s+/g, "-")}-for-${customResource.getScopedName()}`,
                title: <WithTooltip>{formatJSONValue(safeJSONPathValue(customResource, column.jsonPath))}</WithTooltip>,
              }),
            ),
            <KubeObjectAge key="age" object={customResource} />,
          ]}
          failedToLoadMessage={
            <>
              <p>{`Failed to load ${resource.pluralName}`}</p>
              {resource.unservedVersion && (
                <p>{`Preferred version (${resource.group}/${resource.unservedVersion}) is not served`}</p>
              )}
            </>
          }
        />
      </TabLayout>
    );
  }
}

export const CustomResources = withInjectables<Dependencies>(NonInjectedCustomResources, {
  getProps: (di) => ({
    ...di.inject(customResourcesRouteParametersInjectable),
    apiManager: di.inject(apiManagerInjectable),
    customResourceDefinitionStore: di.inject(customResourceDefinitionStoreInjectable),
    discoveredCustomResources: di.inject(discoveredCustomResourcesInjectable),
  }),
});
