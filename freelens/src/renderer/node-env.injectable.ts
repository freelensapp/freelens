import { nodeEnvInjectionToken } from "@freelensapp/core/renderer";
import { getInjectable } from "@ogre-tools/injectable";

export const nodeEnvInjectable = getInjectable({
  id: "node-env",
  instantiate: () => process.env.NODE_ENV || "development",
  injectionToken: nodeEnvInjectionToken,
});
