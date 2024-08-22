import { getInjectable } from "@ogre-tools/injectable";
import { nodeEnvInjectionToken } from "@freelens/core/renderer";

export const nodeEnvInjectable = getInjectable({
  id: "node-env",
  instantiate: () => process.env.NODE_ENV || "development",
  injectionToken: nodeEnvInjectionToken,
});
