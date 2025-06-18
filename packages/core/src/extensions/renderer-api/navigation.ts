/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalFunctionForExtensionApi } from "@freelensapp/legacy-global-di";
import hideEntityDetailsInjectable from "../../renderer/components/catalog/entity-details/hide.injectable";
import showEntityDetailsInjectable from "../../renderer/components/catalog/entity-details/show.injectable";
import getDetailsUrlInjectable from "../../renderer/components/kube-detail-params/get-details-url.injectable";
import hideDetailsInjectable from "../../renderer/components/kube-detail-params/hide-details.injectable";
import showDetailsInjectable from "../../renderer/components/kube-detail-params/show-details.injectable";
import createPageParamInjectable from "../../renderer/navigation/create-page-param.injectable";
import isActiveRouteInjectable from "../../renderer/navigation/is-route-active.injectable";
import navigateInjectable from "../../renderer/navigation/navigate.injectable";

export type { URLParams } from "@freelensapp/utilities";

export type { PageParam, PageParamInit } from "../../renderer/navigation/page-param";

export const getDetailsUrl = asLegacyGlobalFunctionForExtensionApi(getDetailsUrlInjectable);
export const showDetails = asLegacyGlobalFunctionForExtensionApi(showDetailsInjectable);
export const hideDetails = asLegacyGlobalFunctionForExtensionApi(hideDetailsInjectable);
export const createPageParam = asLegacyGlobalFunctionForExtensionApi(createPageParamInjectable);
export const isActiveRoute = asLegacyGlobalFunctionForExtensionApi(isActiveRouteInjectable);
export const navigate = asLegacyGlobalFunctionForExtensionApi(navigateInjectable);

export const showEntityDetails = asLegacyGlobalFunctionForExtensionApi(showEntityDetailsInjectable);
export const hideEntityDetails = asLegacyGlobalFunctionForExtensionApi(hideEntityDetailsInjectable);
