/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import hideEntityDetailsInjectable, {
  type HideEntityDetails,
} from "../../renderer/components/catalog/entity-details/hide.injectable";
import showEntityDetailsInjectable, {
  type ShowEntityDetails,
} from "../../renderer/components/catalog/entity-details/show.injectable";
import getDetailsUrlInjectable, {
  type GetDetailsUrl,
} from "../../renderer/components/kube-detail-params/get-details-url.injectable";
import getMaybeDetailsUrlInjectable, {
  type GetMaybeDetailsUrl,
} from "../../renderer/components/kube-detail-params/get-maybe-details-url.injectable";
import hideDetailsInjectable, {
  type HideDetails,
} from "../../renderer/components/kube-detail-params/hide-details.injectable";
import showDetailsInjectable, {
  type ShowDetails,
} from "../../renderer/components/kube-detail-params/show-details.injectable";
import createPageParamInjectable, {
  type CreatePageParam,
} from "../../renderer/navigation/create-page-param.injectable";
import isActiveRouteInjectable, { type IsRouteActive } from "../../renderer/navigation/is-route-active.injectable";
import navigateInjectable, { type Navigate } from "../../renderer/navigation/navigate.injectable";
import { asLazyInjectedFunctionForExtensionApi } from "../extension-api-di";

export type { URLParams } from "@freelensapp/utilities";

export type { PageParam, PageParamInit } from "../../renderer/navigation/page-param";
export type {
  CreatePageParam,
  GetDetailsUrl,
  GetMaybeDetailsUrl,
  HideDetails,
  HideEntityDetails,
  IsRouteActive,
  Navigate,
  ShowDetails,
  ShowEntityDetails,
};

export const getDetailsUrl = asLazyInjectedFunctionForExtensionApi(getDetailsUrlInjectable);
export const getMaybeDetailsUrl = asLazyInjectedFunctionForExtensionApi(getMaybeDetailsUrlInjectable);
export const showDetails = asLazyInjectedFunctionForExtensionApi(showDetailsInjectable);
export const hideDetails = asLazyInjectedFunctionForExtensionApi(hideDetailsInjectable);
export const createPageParam = asLazyInjectedFunctionForExtensionApi(createPageParamInjectable);
export const isActiveRoute = asLazyInjectedFunctionForExtensionApi(isActiveRouteInjectable);
export const navigate = asLazyInjectedFunctionForExtensionApi(navigateInjectable);

export const showEntityDetails = asLazyInjectedFunctionForExtensionApi(showEntityDetailsInjectable);
export const hideEntityDetails = asLazyInjectedFunctionForExtensionApi(hideEntityDetailsInjectable);
