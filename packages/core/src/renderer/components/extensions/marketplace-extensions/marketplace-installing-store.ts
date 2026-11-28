import { observable } from "mobx";

const installingKeys = observable.set<string>();
const updatingKeys = observable.set<string>();

export const markMarketplaceInstalling = (key: string): void => {
  installingKeys.add(key);
};

export const clearMarketplaceInstalling = (key: string): void => {
  installingKeys.delete(key);
};

export const isMarketplaceInstalling = (key: string): boolean => installingKeys.has(key);

export const markMarketplaceUpdating = (key: string): void => {
  updatingKeys.add(key);
};

export const clearMarketplaceUpdating = (key: string): void => {
  updatingKeys.delete(key);
};

export const isMarketplaceUpdating = (key: string): boolean => updatingKeys.has(key);
