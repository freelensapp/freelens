import type { ContainerWithType, EphemeralContainerWithType, PodContainerStatus } from "@freelensapp/kube-object/dist";

export function containerStatusClassName(
  container: ContainerWithType | EphemeralContainerWithType,
  status?: PodContainerStatus,
) {
  const state = status ? Object.keys(status?.state ?? {})[0] : "";
  const lastState = status ? Object.keys(status?.lastState ?? {})[0] : "";

  if (state === "terminated") {
    return "terminated";
  } else if (container.type === "ephemeralContainers" && lastState === "terminated") {
    return "terminated";
  } else if (container.type === "ephemeralContainers") {
    return "container-ephemeral";
  } else if (status?.ready && status?.restartCount > 0) {
    return "restarted";
  } else if (status?.ready) {
    return "running";
  } else if (state === "running") {
    return "waiting";
  } else {
    return state;
  }
}
