/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export type IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
export type IpcRendererEvent = Electron.IpcRendererEvent;
export type IpcMainEvent = Electron.IpcMainEvent;

export type {
  ProtocolHandlerRegistration,
  RouteHandler as ProtocolRouteHandler,
  RouteParams as ProtocolRouteParams,
} from "../../common/protocol-handler/registration";
export type { MenuRegistration } from "../../features/application-menu/main/menu-registration";
export type {
  AppPreferenceComponents,
  AppPreferenceRegistration,
} from "../../features/preferences/renderer/compliance-for-legacy-extension-api/app-preference-registration";
export type {
  ShellEnvContext,
  ShellEnvModifier,
} from "../../main/shell-session/shell-env-modifier/shell-env-modifier-registration";
export type { TrayMenuRegistration } from "../../main/tray/tray-menu-registration";
export type {
  CustomCategoryViewComponents,
  CustomCategoryViewProps,
  CustomCategoryViewRegistration,
} from "../../renderer/components/catalog/custom-views";
export type {
  KubeObjectDetailComponents,
  KubeObjectDetailRegistration,
} from "../../renderer/components/kube-object-details/kube-object-detail-registration";
export type {
  KubeObjectMenuComponents,
  KubeObjectMenuItemProps,
  KubeObjectMenuRegistration,
} from "../../renderer/components/kube-object-menu/kube-object-menu-registration";
export type { KubeObjectStatusRegistration } from "../../renderer/components/kube-object-status-icon/kube-object-status-registration";
export type {
  ClusterPageMenuComponents,
  ClusterPageMenuRegistration,
} from "../../renderer/components/layout/cluster-page-menu";
export type { StatusBarRegistration } from "../../renderer/components/status-bar/status-bar-registration";
export type {
  KubeObjectContextMenuItem,
  KubeObjectHandlerRegistration,
  KubeObjectHandlers,
  KubeObjectOnContextMenuOpen,
  KubeObjectOnContextMenuOpenContext,
} from "../../renderer/kube-object/handler";
export type {
  PageComponentProps,
  PageComponents,
  PageParams,
  PageRegistration,
  PageTarget,
  RegisteredPage,
} from "../../renderer/routes/page-registration";
