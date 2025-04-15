import path from "path";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

export type GetBasenameOfPath = (path: string) => string;

const getBasenameOfPathInjectable = getInjectable({
  id: "get-basename-of-path",
  instantiate: (): GetBasenameOfPath => path.basename,
  causesSideEffects: true,
});

export default getBasenameOfPathInjectable;
