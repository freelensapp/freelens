import { getGlobalOverride } from "@freelensapp/test-utils";
import powerMonitorInjectable from "./power-monitor.injectable";

class DummyPowerMonitor {
  private listeners: Record<string, Function[]> = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
    }
    return this;
  }

  removeListener(event: string, listener: Function) {
    return this.off(event, listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]) {
        listener(...args);
      }
    }
    return true;
  }
}

export default getGlobalOverride(powerMonitorInjectable, () => new DummyPowerMonitor() as any);
