/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import appEventBusInjectable from "../../common/app-event-bus/app-event-bus.injectable";

import type { EventEmitter, EventEmitterCallback, EventEmitterOptions } from "@freelensapp/event-emitter";

import type { AppEvent } from "../../common/app-event-bus/event-bus";

export type { AppEvent, EventEmitter, EventEmitterCallback, EventEmitterOptions };

export const appEventBus = asLegacyGlobalForExtensionApi(appEventBusInjectable);
