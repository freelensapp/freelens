/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { nextTick } from "node:process";
import { enlistMessageChannelListenerInjectionToken, sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { observable, runInAction } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { shouldPersistentStorageDisableSyncInIpcListenerInjectionToken } from "../../features/persistent-storage/common/disable-sync";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { BaseExtensionStore } from "../base-extension-store";
import { LensMainExtension } from "../lens-main-extension";

import type { MessageChannelListener } from "@freelensapp/messaging";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

interface TestStoreModel {
  token: string;
}

class TestStore extends BaseExtensionStore<TestStoreModel> {
  @observable accessor token = "initial";

  constructor() {
    super({
      configName: "test-store",
      defaults: { token: "initial" },
    });
  }

  fromStore({ token = "initial" }: Partial<TestStoreModel>) {
    runInAction(() => {
      this.token = token;
    });
  }

  toJSON(): TestStoreModel {
    return { token: this.token };
  }
}

const createExtension = () =>
  new LensMainExtension({
    id: "/some-extension/package.json",
    manifestPath: "/some-extension/package.json",
    manifest: {
      name: "some-extension",
      version: "1.0.0",
      engines: { freelens: "^2.0.0" },
    },
    isEnabled: true,
    isCompatible: true,
    isManaged: true,
    isVerified: true,
    absolutePath: "/some-extension",
  });

// What onActivate of an extension does: the class, and so its instance, is
// the same one on every activation, because the module stays cached.
const activate = async (extension: LensMainExtension) => {
  await extension.enable();
  TestStore.getInstanceOrCreate<TestStore>().loadExtension(extension);
};

const setToken = (token: string) => {
  runInAction(() => {
    TestStore.getInstance<TestStore>().token = token;
  });
};

describe("syncing of an extension store", () => {
  let di: DiContainer;
  let sendMessageToChannelMock: Mock;
  let listeners: Set<MessageChannelListener<any>>;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    sendMessageToChannelMock = vi.fn();
    di.override(sendMessageToChannelInjectionToken, () => sendMessageToChannelMock);

    listeners = new Set();
    di.override(enlistMessageChannelListenerInjectionToken, () => (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    });
  });

  afterEach(() => {
    TestStore.resetInstance();
  });

  const receiveFromOtherProcess = (model: TestStoreModel) => {
    for (const listener of [...listeners]) {
      listener.handler(model);
    }
  };

  describe("when the extension is activated", () => {
    let extension: LensMainExtension;

    beforeEach(async () => {
      extension = createExtension();
      await activate(extension);
      sendMessageToChannelMock.mockClear();
    });

    it("listens for the other process once", () => {
      expect(listeners.size).toBe(1);
    });

    it("sends a change to the other process once", () => {
      setToken("some-token");

      expect(sendMessageToChannelMock).toHaveBeenCalledTimes(1);
    });

    describe("when the extension is disabled", () => {
      beforeEach(async () => {
        await extension.disable();
        sendMessageToChannelMock.mockClear();
      });

      it("stops listening for the other process", () => {
        expect(listeners.size).toBe(0);
      });

      it("no longer sends a change to the other process", () => {
        setToken("some-token");

        expect(sendMessageToChannelMock).not.toHaveBeenCalled();
      });

      describe("when the extension is enabled again", () => {
        beforeEach(async () => {
          await activate(createExtension());
          sendMessageToChannelMock.mockClear();
        });

        it("listens for the other process once", () => {
          expect(listeners.size).toBe(1);
        });

        it("sends a change to the other process once", () => {
          setToken("some-token");

          expect(sendMessageToChannelMock).toHaveBeenCalledTimes(1);
        });

        it("applies a change from the other process without sending it back twice", () => {
          receiveFromOtherProcess({ token: "some-token-from-the-other-process" });

          expect(TestStore.getInstance<TestStore>().token).toBe("some-token-from-the-other-process");
          expect(sendMessageToChannelMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("when the store is loaded for the extension again", () => {
      beforeEach(() => {
        TestStore.getInstance<TestStore>().loadExtension(extension);
        sendMessageToChannelMock.mockClear();
      });

      it("listens for the other process once", () => {
        expect(listeners.size).toBe(1);
      });

      it("sends a change to the other process once", () => {
        setToken("some-token");

        expect(sendMessageToChannelMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("given the sync pauses while it applies a change from the other process, as in the renderer", () => {
    let extension: LensMainExtension;

    beforeEach(async () => {
      di.override(shouldPersistentStorageDisableSyncInIpcListenerInjectionToken, () => true);

      extension = createExtension();
      await activate(extension);
    });

    describe("when the extension is disabled while the sync is paused", () => {
      beforeEach(async () => {
        receiveFromOtherProcess({ token: "some-token-from-the-other-process" });
        await extension.disable();
        await new Promise((resolve) => nextTick(resolve));
        sendMessageToChannelMock.mockClear();
      });

      it("does not resume listening for the other process", () => {
        expect(listeners.size).toBe(0);
      });

      it("does not resume sending a change to the other process", () => {
        setToken("some-token");

        expect(sendMessageToChannelMock).not.toHaveBeenCalled();
      });
    });
  });
});
