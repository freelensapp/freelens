/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { LegacyLensExtension } from "@freelensapp/legacy-extensions";

import type { Injectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";

export type Injectables = Injectable<any, any, any>[];
export type Registration = Injectables | IComputedValue<Injectables>;
export type ExtensionRegistrator = (extension: LegacyLensExtension) => Registration;

export const extensionRegistratorInjectionToken = getInjectionToken<ExtensionRegistrator>({
  id: "extension-registrator-token",
});
