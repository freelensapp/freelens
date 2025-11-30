import { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import { runInAction } from "mobx";

interface Dependencies {
  userPreferences: UserPreferencesState;
}

const useSidebarHook = ({ userPreferences }: Dependencies) => {

  const saveOrderInfo = (startIndex: number, releaseIndex: number) => {
    const orderedClusterPageMenuOrder = __orderClusterPageMenuOrder(userPreferences);
    const userPreferencesElements = Object.entries(orderedClusterPageMenuOrder!).map((entry) => entry[0]);

    if (startIndex === releaseIndex) return;
    if (startIndex < 0) return;
    if (startIndex >= userPreferencesElements.length) return;
    if (releaseIndex < 0) return;
    if (releaseIndex >= userPreferencesElements.length) return;

    const [itemToMove] = userPreferencesElements.splice(startIndex, 1);
    userPreferencesElements.splice(releaseIndex, 0, itemToMove);

    const newOrder = __orderElements(userPreferencesElements);
    __updateStorage(newOrder);
  };

  const __orderClusterPageMenuOrder = (userPreferences: UserPreferencesState) => {
    return Object.fromEntries(
      Object.entries(userPreferences.clusterPageMenuOrder ?? {}).sort(([, valueA], [, valueB]) => valueA - valueB)
    );
  }

  const __orderElements = (userPreferencesElements: string[]): Record<string, number> => {
    return Object.fromEntries(userPreferencesElements.map<[string, number]>((item, index) => [item, (index + 1) * 10]));
  };

  const __updateStorage = (newOrder: Record<string, number>) => {
    runInAction(() => userPreferences.clusterPageMenuOrder = newOrder);
  };

  return { saveOrderInfo };
};

export default useSidebarHook;
