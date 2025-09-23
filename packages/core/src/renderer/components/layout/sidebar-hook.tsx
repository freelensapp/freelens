import { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import { runInAction } from "mobx";

interface Dependencies {
  userPreferencesState: UserPreferencesState;
}

const useSidebarHook = ({userPreferencesState}: Dependencies) => {
  const saveOrderInfo = (startIndex: number, releaseIndex: number) => {
    if (startIndex === releaseIndex) return;
    if (startIndex < 0) return;
    if (startIndex >= Object.keys(userPreferencesState.clusterPageMenuOrder!).length) return;
    if (releaseIndex >= Object.keys(userPreferencesState.clusterPageMenuOrder!).length) return;
    if (releaseIndex < 0) return;

    const keys = Object.keys(userPreferencesState.clusterPageMenuOrder!);
    const [itemToMove] = keys.splice(startIndex, 1);
    keys.splice(releaseIndex, 0, itemToMove);

    const newOrder = Object.fromEntries(
      keys.map((item, index) => [item, (index + 1) * 10])
    );

    // @ts-ignore
    runInAction(() => userPreferencesState.clusterPageMenuOrder = newOrder);
  }

  return { saveOrderInfo }
}

export default useSidebarHook;
