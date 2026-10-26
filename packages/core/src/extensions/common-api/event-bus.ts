/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import appEventBusInjectable from "../../common/app-event-bus/app-event-bus.injectable";
import { asLazyInjectedForExtensionApi } from "../extension-api-di";

import type { EventEmitterCallback, EventEmitterOptions } from "@freelensapp/event-emitter";

import type { AppEvent } from "../../common/app-event-bus/event-bus";

export type { AppEvent, EventEmitterCallback, EventEmitterOptions };

// A type alias instead of a type-only re-export, which rolldown-plugin-dts would
// declare as a value too, although the class does not exist at runtime here.
export type EventEmitter<D extends any[]> = import("@freelensapp/event-emitter").EventEmitter<D>;

export const appEventBus = asLazyInjectedForExtensionApi(appEventBusInjectable);
