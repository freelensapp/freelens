export enum SidebarMenuItem {
  Favorites = "sidebar-item-favorites",
  ClusterOverview = "sidebar-item-cluster-overview",
  Nodes = "sidebar-item-nodes",
  Workloads = "sidebar-item-workloads",
  Config = "sidebar-item-config",
  Network = "sidebar-item-network",
  Storage = "sidebar-item-storage",
  Namespaces = "sidebar-item-namespaces",
  Events = "sidebar-item-events",
  Helm = "sidebar-item-helm",
  UserManagement = "sidebar-item-user-management",
  CustomResources = "sidebar-item-custom-resources",
}

export const sidebarMenuItemIds: Record<SidebarMenuItem, number> = {
  [SidebarMenuItem.Favorites]: 0,
  [SidebarMenuItem.ClusterOverview]: 10,
  [SidebarMenuItem.Nodes]: 20,
  [SidebarMenuItem.Workloads]: 30,
  [SidebarMenuItem.Config]: 40,
  [SidebarMenuItem.Network]: 50,
  [SidebarMenuItem.Storage]: 60,
  [SidebarMenuItem.Namespaces]: 70,
  [SidebarMenuItem.Events]: 80,
  [SidebarMenuItem.Helm]: 90,
  [SidebarMenuItem.UserManagement]: 100,
  [SidebarMenuItem.CustomResources]: 110,
};
