import { getInjectionToken } from "@ogre-tools/injectable";

import type { IComputedValue } from "mobx";
import type React from "react";

export interface ReactApplicationChildren {
  id: string;
  Component: React.ComponentType;
  enabled: IComputedValue<boolean>;
}

export const reactApplicationChildrenInjectionToken = getInjectionToken<ReactApplicationChildren>({
  id: "react-application-children-injection-token",
});
