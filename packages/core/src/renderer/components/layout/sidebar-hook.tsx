import { InstalledExtension, LensExtensionId } from "@freelensapp/legacy-extensions/src/lens-extension";
import { useEffect, useState } from "react";
import { ExtensionLoader } from "../../../extensions/extension-loader";
import { getExtensionId, sanitizeExtensionName } from "../../../extensions/lens-extension";
import { SidebarStorageState } from "./sidebar-storage/sidebar-storage.injectable";

import type { StorageLayer } from "../../utils/storage-helper";

interface Dependencies {
  sidebarStorage: StorageLayer<SidebarStorageState>;
  extensionLoader: ExtensionLoader;
}

const useSidebarHook = ({ sidebarStorage, extensionLoader }: Dependencies) => {
  const [currentExtensionIds, setCurrentExtensionIds] = useState<string[]>([]);

  useEffect(() => {
    const allExtensionIds = __getAllExtensionIds();

    if (currentExtensionIds.length === 0) {
      setCurrentExtensionIds(allExtensionIds);
      return;
    }

    if (allExtensionIds.length < currentExtensionIds.length) {
      // A new extension has been removed
      const removedExtensions = currentExtensionIds.filter((item) => !allExtensionIds.includes(item));

      const sidebarStorageElements = Object.entries(sidebarStorage.get().order)
        .sort(([, a], [, b]) => a - b)
        .map((entry) => entry[0])
        .filter((extensionName) => !removedExtensions.includes(extensionName));

      const newOrder = __orderElements(sidebarStorageElements);
      __updateStorage(newOrder);
    }
  }, [extensionLoader.toJSON()]);

  const saveOrderInfo = (startIndex: number, releaseIndex: number) => {
    const sidebarStorageElements = Object.entries(sidebarStorage.get().order).map((entry) => entry[0]);

    if (startIndex === releaseIndex) return;
    if (startIndex < 0) return;
    if (startIndex >= sidebarStorageElements.length) return;
    if (releaseIndex < 0) return;
    if (releaseIndex >= sidebarStorageElements.length) return;

    const [itemToMove] = sidebarStorageElements.splice(startIndex, 1);
    sidebarStorageElements.splice(releaseIndex, 0, itemToMove);

    const newOrder = __orderElements(sidebarStorageElements);
    __updateStorage(newOrder);
  };

  const __getAllExtensionIds = () => {
    const extensions: Map<LensExtensionId, InstalledExtension> = extensionLoader.toJSON() as Map<
      LensExtensionId,
      InstalledExtension
    >;
    return extensions
      .values()
      .filter((installedExtension) => installedExtension.isEnabled)
      .map((enabledExtension) => {
        let extensionName = enabledExtension.manifest.name;
        return getExtensionId(sanitizeExtensionName(extensionName));
      })
      .toArray();
  };

  const __orderElements = (sidebarStorageElements: string[]): Record<string, number> => {
    return Object.fromEntries(sidebarStorageElements.map<[string, number]>((item, index) => [item, (index + 1) * 10]));
  };

  const __updateStorage = (newOrder: Record<string, number>) => {
    sidebarStorage.merge((draft) => {
      draft.order = newOrder;
    });
  };

  return { saveOrderInfo };
};

export default useSidebarHook;
