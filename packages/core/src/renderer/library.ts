/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./components/app.scss";
import "./monaco/setup-monaco-environment";

import React from "react";
import ReactDOM from "react-dom";
import setStatusBarStatusInjectable from "./components/status-bar/set-status-bar-status.injectable";

export * as Mobx from "mobx";
export * as MobxReact from "mobx-react";
export * as ReactJsxRuntime from "react/jsx-runtime";
// @experimental
export { nodeEnvInjectionToken } from "../common/vars/node-env-injection-token";
export * as commonExtensionApi from "../extensions/common-api";
export * as rendererExtensionApi from "../extensions/renderer-api";
export { metricsFeature } from "../features/metrics/metrics-feature";
export { registerLensCore } from "./register-lens-core";
export { React, ReactDOM, setStatusBarStatusInjectable };
