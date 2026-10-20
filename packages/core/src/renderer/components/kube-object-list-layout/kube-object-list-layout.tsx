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
import { sortBy } from "es-toolkit/compat";
import { observable, reaction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { resolveCustomColumnPriorities } from "../../../features/custom-table-columns/common/resolve-custom-column-priorities";
import openCustomColumnDialogInjectable from "../../../features/custom-table-columns/renderer/custom-column-dialog/open.injectable";
import customListLayoutColumnsInjectable from "../../../features/custom-table-columns/renderer/custom-list-layout-columns.injectable";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { ResourceKindMap, ResourceNames } from "../../utils/rbac";
import { ItemListLayout } from "../item-object-list/list-layout";
import kubeSelectedUrlParamInjectable from "../kube-detail-params/kube-selected-url.injectable";
import toggleKubeDetailsPaneInjectable from "../kube-detail-params/toggle-details.injectable";
import { KubeObjectMenu } from "../kube-object-menu";
import { MenuControls, MenuItem } from "../menu";
import { NamespaceSelectFilter } from "../namespaces/namespace-select-filter";

import type { KubeApi } from "@freelensapp/kube-api";
import type { KubeJsonApiDataFor, KubeObject } from "@freelensapp/kube-object";
import type {
  GeneralKubeObjectListLayoutColumn,
  SpecificKubeListLayoutColumn,
  TableCellProps,
} from "@freelensapp/list-layout";
import type { Disposer } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { OpenCustomColumnDialog } from "../../../features/custom-table-columns/renderer/custom-column-dialog/open.injectable";
import type { CustomKubeObjectListLayoutColumn } from "../../../features/custom-table-columns/renderer/custom-list-layout-columns.injectable";
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
  customColumns: IComputedValue<CustomKubeObjectListLayoutColumn[]>;
  openCustomColumnDialog: OpenCustomColumnDialog;
}

const matchesApiFor =
  (api: SubscribableStore["api"]) => (column: Pick<GeneralKubeObjectListLayoutColumn, "kind" | "apiVersion">) =>
    column.kind === api.kind &&
    (isString(api.apiVersionWithGroup) ? [column.apiVersion].flat().includes(api.apiVersionWithGroup) : true);

/**
 * The priority of every column of this list that a custom column may be anchored to, both the ones
 * passed as plain headers and the ones contributed as column definitions.
 */
const getColumnPriorities = (
  headers: { priority: number; header: TableCellProps | undefined | null }[],
  columns: { id: string; priority: number }[],
) => {
  const priorities = new Map<string, number>();

  for (const { priority, header } of headers) {
    if (header?.id) {
      priorities.set(header.id, priority);
    }
  }

  for (const { id, priority } of columns) {
    priorities.set(id, priority);
  }

  return priorities;
};

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

  private readonly disposers: (() => void)[] = [];
  private readonly loadErrors = observable.array<string>();
  private readonly menuControls = new Map<string, MenuControls>();

  // Plain getter (not @computed): reads this.props, which mobx-react 9 forbids
  // inside a derivation. Read from render, reactivity is preserved by the
  // observer render reaction.
  get selectedItem() {
    return this.props.store.getByPath(this.props.kubeSelectedUrlParam.get());
  }

  componentDidMount() {
    const { store, dependentStores = [], subscribeStores, clusterFrameContext } = this.props;
    const stores = Array.from(new Set([store, ...dependentStores]));
    const reactions: Disposer[] = [
      reaction(
        // Read from the captured context, not this.props: mobx-react 9 forbids
        // reading this.props inside a derivation (this reaction's data function).
        () => clusterFrameContext.contextNamespaces.slice(),
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

    this.disposers.push(...reactions);
  }

  componentWillUnmount() {
    this.disposers.forEach((dispose) => dispose());
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
      customColumns,
      openCustomColumnDialog,
      sortingCallbacks = {},
      customizeTableRowProps,
      ...layoutProps
    } = this.props;
    const resourceName = this.props.resourceName || ResourceNames[ResourceKindMap[store.api.kind]] || store.api.kind;
    const headerColumns = (renderTableHeader || []).map((header, index) => ({ priority: 20 - index, header }));
    const definedColumns = [...(columns ?? []), ...generalColumns.filter(matchesApiFor(store.api))];
    const targetColumns = [
      ...definedColumns,
      ...resolveCustomColumnPriorities(
        getColumnPriorities(headerColumns, definedColumns),
        customColumns.get().filter(matchesApiFor(store.api)),
      ),
    ];

    void dependentStores;

    targetColumns.forEach((col) => {
      if (col.sortingCallBack) {
        sortingCallbacks[col.id] = col.sortingCallBack;
      }
    });

    const headers = sortBy([...headerColumns, ...targetColumns], (v) => -v.priority).map((col) => col.header);
    const { apiVersionWithGroup } = store.api;
    // A column is defined for a kind and an api version, so without one there is nothing to offer.
    const renderColumnMenuFooter = isString(apiVersionWithGroup)
      ? () => (
          <MenuItem
            data-testid="add-custom-column-menu-item"
            onClick={() =>
              openCustomColumnDialog({
                kind: store.api.kind,
                apiVersion: apiVersionWithGroup,
                anchors: headers
                  .filter(isDefined)
                  .filter((header): header is typeof header & { id: string } => isString(header.id))
                  .map((header) => ({
                    id: header.id,
                    title: isString(header.title) ? header.title : header.id,
                  })),
                getPreviewItems: () => items ?? store.contextItems,
              })
            }
          >
            <Icon material="add" small />
            <span>Add column...</span>
          </MenuItem>
        )
      : undefined;

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
        // Read captured locals, not this.props: ItemListLayout invokes getItems
        // from within its own derivation, where mobx-react 9 forbids this.props.
        getItems={() => items || store.contextItems}
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
        renderColumnMenuFooter={layoutProps.renderColumnMenuFooter ?? renderColumnMenuFooter}
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
    customColumns: di.inject(customListLayoutColumnsInjectable),
    openCustomColumnDialog: di.inject(openCustomColumnDialogInjectable),
  }),
}) as <K extends KubeObject, A extends KubeApi<K, D>, D extends KubeJsonApiDataFor<K> = KubeJsonApiDataFor<K>>(
  props: KubeObjectListLayoutProps<K, A, D>,
) => React.ReactElement;
