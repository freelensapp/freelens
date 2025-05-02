import type { RequestChannel, RequestChannelListener } from "@freelensapp/messaging";
import { enlistRequestChannelListenerInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import type { IpcMainInvokeEvent } from "electron";
import ipcMainInjectable from "../ipc-main/ipc-main.injectable";

export type EnlistRequestChannelListener = <TChannel extends RequestChannel<unknown, unknown>>(
  listener: RequestChannelListener<TChannel>,
) => () => void;

const enlistRequestChannelListenerInjectable = getInjectable({
  id: "enlist-request-channel-listener-for-main",

  instantiate: (di): EnlistRequestChannelListener => {
    const ipcMain = di.inject(ipcMainInjectable);

    return ({ channel, handler }) => {
      const nativeHandleCallback = (_: IpcMainInvokeEvent, request: unknown) => handler(request);

      ipcMain.handle(channel.id, nativeHandleCallback);

      return () => {
        ipcMain.off(channel.id, nativeHandleCallback);
      };
    };
  },

  injectionToken: enlistRequestChannelListenerInjectionToken,
});

export default enlistRequestChannelListenerInjectable;
