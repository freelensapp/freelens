import { getInjectable } from "@ogre-tools/injectable";

export interface FrameId {
  frameId: number;
  processId: number;
}

// Keyed by frame, so a frame that registers again, e.g. after a reload, is still sent each message once
const frameIdsInjectable = getInjectable({
  id: "frame-ids",
  instantiate: () => new Map<string, FrameId>(),
});

export const toFrameIdKey = ({ frameId, processId }: FrameId) => `${processId}:${frameId}`;

export default frameIdsInjectable;
