/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import safeStorageInjectable from "./safe-storage.injectable";

// A secret store that is not there: a test that needs one overrides this with
// a fake of its own.
export default getGlobalOverride(safeStorageInjectable, () => ({
  isAsyncEncryptionAvailable: async () => false,
  encryptStringAsync: async () => {
    throw new Error("Tried to encrypt without an override of safeStorage");
  },
  decryptStringAsync: async () => {
    throw new Error("Tried to decrypt without an override of safeStorage");
  },
  getSelectedStorageBackend: () => "basic_text",
}));
