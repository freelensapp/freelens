import { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

export const flattenSidebarItems = (items: SidebarItemDeclaration[]): SidebarItemDeclaration[] => {
  return items.reduce((acc, item) => {
    acc.push(item);
    if (item.children?.length > 0) {
      acc.push(...flattenSidebarItems(item.children));
    }
    return acc;
  }, [] as SidebarItemDeclaration[]);
};
