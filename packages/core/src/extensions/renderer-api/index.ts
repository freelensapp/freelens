/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Lens-extensions apis, required in renderer process runtime

import { IpcRenderer as Ipc } from "../ipc/ipc-renderer";
import { LensRendererExtension as LensExtension } from "../lens-renderer-extension";
// APIs
import * as Catalog from "./catalog";
import * as Component from "./components";
import * as K8sApi from "./k8s-api";
import * as Navigation from "./navigation";
import * as Theme from "./theming";

export { Catalog, Component, K8sApi, Navigation, Theme, Ipc, LensExtension };
