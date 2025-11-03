/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kube-object-list-layout.scss";

import { Icon } from "@freelensapp/icon";
import { kubeObjectListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { TooltipPosition } from "@freelensapp/tooltip";
import { cssNames, hasTypedProperty, isDefined, isObject, isString } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { sortBy } from "lodash";
import { computed, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { ResourceKindMap, ResourceNames } from "../../utils/rbac";
import { ItemListLayout } from "../item-object-list/list-layout";
import kubeSelectedUrlParamInjectable from "../kube-detail-params/kube-selected-url.injectable";
import toggleKubeDetailsPaneInjectable from "../kube-detail-params/toggle-details.injectable";
import { KubeObjectMenu } from "../kube-object-menu";
import { MenuControls } from "../menu";
import { NamespaceSelectFilter } from "../namespaces/namespace-select-filter";

import type { KubeApi } from "@freelensapp/kube-api";
import type { KubeJsonApiDataFor, KubeObject } from "@freelensapp/kube-object";
import type { GeneralKubeObjectListLayoutColumn, SpecificKubeListLayoutColumn } from "@freelensapp/list-layout";
import type { Disposer } from "@freelensapp/utilities";

import type { ClusterContext } from "../../cluster-frame-context/cluster-frame-context";
import type { SubscribableStore, SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { PageParam } from "../../navigation/page-param";
import type { ItemListLayoutProps, ItemListStore } from "../item-object-list/list-layout";
import type { ToggleKubeDetailsPane } from "../kube-detail-params/toggle-details.injectable";

export type KubeItemListStore<K extends KubeObject> = ItemListStore<K, false> &
  SubscribableStore & {
    getByPath: (path: string) => K | undefined;
    readonly contextItems: K[];
  };

export interface KubeObjectListLayoutProps<
  K extends KubeObject,
  _ extends KubeApi<K, D>,
  D extends KubeJsonApiDataFor<K>,
> extends Omit<ItemListLayoutProps<K, false>, "getItems" | "dependentStores" | "preloadStores"> {
  items?: K[];
  getItems?: () => K[];
  store: KubeItemListStore<K>;
  dependentStores?: SubscribableStore[];
  subscribeStores?: boolean;

  /**
   * Customize resource name for e.g. search input ("Search <ResourceName>..."")
   * If not provided, ResourceNames is used instead with a fallback to resource kind.
   */
  resourceName?: string;
  columns?: SpecificKubeListLayoutColumn<K>[];
}

interface Dependencies {
  clusterFrameContext: ClusterContext;
  subscribeToStores: SubscribeStores;
  kubeSelectedUrlParam: PageParam<string>;
  toggleKubeDetailsPane: ToggleKubeDetailsPane;
  generalColumns: GeneralKubeObjectListLayoutColumn[];
}

const matchesApiFor = (api: SubscribableStore["api"]) => (column: GeneralKubeObjectListLayoutColumn) =>
  column.kind === api.kind &&
  (isString(api.apiVersionWithGroup) ? [column.apiVersion].flat().includes(api.apiVersionWithGroup) : true);

const getLoadErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.cause) {
      return `${error.message}: ${getLoadErrorMessage(error.cause)}`;
    }

    return error.message;
  }

  if (isObject(error) && hasTypedProperty(error, "message", isString)) {
    return error.message;
  }

  return `${String(error)}`;
};

@observer
class NonInjectedKubeObjectListLayout<
  K extends KubeObject,
  A extends KubeApi<K, D>,
  D extends KubeJsonApiDataFor<K>,
> extends React.Component<KubeObjectListLayoutProps<K, A, D> & Dependencies> {
  static defaultProps = {
    subscribeStores: true,
  };

  private readonly loadErrors = observable.array<string>();
  private readonly menuControls = new Map<string, MenuControls>();

  @computed get selectedItem() {
    return this.props.store.getByPath(this.props.kubeSelectedUrlParam.get());
  }

  componentDidMount() {
    const { store, dependentStores = [], subscribeStores } = this.props;
    const stores = Array.from(new Set([store, ...dependentStores]));
    const reactions: Disposer[] = [
      reaction(
        () => this.props.clusterFrameContext.contextNamespaces.slice(),
        () => {
          // clear load errors
          this.loadErrors.length = 0;
        },
      ),
    ];

    if (subscribeStores) {
      reactions.push(
        this.props.subscribeToStores(stores, {
          onLoadFailure: (error) => {
            this.loadErrors.push(getLoadErrorMessage(error));
          },
        }),
      );
    }

    disposeOnUnmount(this, reactions);
  }

  renderLoadErrors() {
    if (this.loadErrors.length === 0) {
      return null;
    }

    return (
      <Icon
        material="warning"
        className="load-error"
        tooltip={{
          children: (
            <>
              {this.loadErrors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </>
          ),
          preferredPositions: TooltipPosition.BOTTOM,
        }}
      />
    );
  }

  private registerControls = (id: string) => (controls: MenuControls) => {
    this.menuControls.set(id, controls);
  };

  render() {
    const {
      className,
      customizeHeader,
      store,
      items,
      dependentStores,
      toggleKubeDetailsPane: toggleDetails,
      onDetails,
      renderTableContents,
      renderTableHeader,
      columns,
      generalColumns,
      sortingCallbacks = {},
      customizeTableRowProps,
      ...layoutProps
    } = this.props;
    const resourceName = this.props.resourceName || ResourceNames[ResourceKindMap[store.api.kind]] || store.api.kind;
    const targetColumns = [...(columns ?? []), ...generalColumns.filter(matchesApiFor(store.api))];

    void items;
    void dependentStores;

    targetColumns.forEach((col) => {
      if (col.sortingCallBack) {
        sortingCallbacks[col.id] = col.sortingCallBack;
      }
    });

    const headers = sortBy(
      [...(renderTableHeader || []).map((header, index) => ({ priority: 20 - index, header })), ...targetColumns],
      (v) => -v.priority,
    ).map((col) => col.header);

    const getTableRowCustomizations = (item: K) => {
      const id = `menu-actions-for-kube-object-menu-for-${item.getId()}`;
      const baseProps = customizeTableRowProps?.(item) ?? {};

      return {
        id,
        ...baseProps,
        onContextMenu: (evt: React.MouseEvent<HTMLDivElement>) => {
          baseProps.onContextMenu?.(evt);

          const controls = this.menuControls.get(id);

          if (!controls) {
            return;
          }

          evt.preventDefault();
          evt.stopPropagation();

          const cursorPosition = { x: evt.clientX, y: evt.clientY };
          const contextTarget = evt.currentTarget as HTMLElement;

          for (const [otherId, otherControls] of this.menuControls.entries()) {
            if (otherId !== id) {
              otherControls.close();
            }
          }

          requestAnimationFrame(() => {
            controls.open({ cursorPosition, contextTarget });
          });
        },
      };
    };

    return (
      <ItemListLayout<K, false>
        className={cssNames("KubeObjectListLayout", className)}
        store={store}
        getItems={() => this.props.items || store.contextItems}
        preloadStores={false} // loading handled in kubeWatchApi.subscribeStores()
        detailsItem={this.selectedItem}
        customizeHeader={[
          ({ filters, searchProps, info, ...headerPlaceHolders }) => ({
            filters: (
              <>
                {filters}
                {store.api.isNamespaced && (
                  <NamespaceSelectFilter id="kube-object-list-layout-namespace-select-input" />
                )}
              </>
            ),
            searchProps: {
              ...searchProps,
              placeholder: `Search ${resourceName}...`,
            },
            info: (
              <>
                {info}
                {this.renderLoadErrors()}
              </>
            ),
            ...headerPlaceHolders,
          }),
          ...[customizeHeader].filter(isDefined).flat(),
        ]}
        renderItemMenu={(item) => (
          <KubeObjectMenu
            id={item.getId()}
            object={item}
            onMenuReady={this.registerControls(`menu-actions-for-kube-object-menu-for-${item.getId()}`)}
          />
        )}
        onDetails={onDetails ?? ((item) => toggleDetails(item.selfLink))}
        sortingCallbacks={sortingCallbacks}
        renderTableHeader={headers}
        renderTableContents={(item) =>
          sortBy(
            [
              ...renderTableContents(item).map((content, index) => ({ priority: 20 - index, content })),
              ...targetColumns.map((col) => ({ priority: col.priority, content: col.content(item) })),
            ],
            (item) => -item.priority,
          ).map((value) => value.content)
        }
        spinnerTestId="kube-object-list-layout-spinner"
        {...layoutProps}
        customizeTableRowProps={getTableRowCustomizations}
      />
    );
  }
}

export const KubeObjectListLayout = withInjectables<
  Dependencies,
  KubeObjectListLayoutProps<
    KubeObject,
    KubeApi<KubeObject, KubeJsonApiDataFor<KubeObject>>,
    KubeJsonApiDataFor<KubeObject>
  >
>(NonInjectedKubeObjectListLayout, {
  getProps: (di, props) => ({
    ...props,
    clusterFrameContext: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
    subscribeToStores: di.inject(subscribeStoresInjectable),
    kubeSelectedUrlParam: di.inject(kubeSelectedUrlParamInjectable),
    toggleKubeDetailsPane: di.inject(toggleKubeDetailsPaneInjectable),
    generalColumns: di.injectMany(kubeObjectListLayoutColumnInjectionToken),
  }),
}) as <K extends KubeObject, A extends KubeApi<K, D>, D extends KubeJsonApiDataFor<K> = KubeJsonApiDataFor<K>>(
  props: KubeObjectListLayoutProps<K, A, D>,
) => React.ReactElement;
