/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { EventEmitter, EventEmitterCallback, EventEmitterOptions } from "@freelensapp/event-emitter";
import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import appEventBusInjectable from "../../common/app-event-bus/app-event-bus.injectable";
import type { AppEvent } from "../../common/app-event-bus/event-bus";

export type { AppEvent, EventEmitter, EventEmitterCallback, EventEmitterOptions };

export const appEventBus = asLegacyGlobalForExtensionApi(appEventBusInjectable);
