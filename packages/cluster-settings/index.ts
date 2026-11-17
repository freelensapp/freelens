import { getInjectionToken } from "@ogre-tools/injectable";

import type React from "react";

type ClusterPreferences = {
  clusterName?: string;
  icon?: string | null;
};

export interface ClusterIconSettingComponentProps {
  preferences: ClusterPreferences;
}

export interface ClusterIconSettingsComponent {
  id: string;
  Component: React.ComponentType<ClusterIconSettingComponentProps>;
}

export const clusterIconSettingsComponentInjectionToken = getInjectionToken<ClusterIconSettingsComponent>({
  id: "cluster-icon-settings-component-injection-token",
});
