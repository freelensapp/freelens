import { overrideSideEffectsWithFakes } from "./src/test-utils/override-side-effects-with-fakes";

export { applicationFeatureForElectronMain } from "./src/feature";
export * from "./src/start-application/time-slots";

export const testUtils = { overrideSideEffectsWithFakes };
