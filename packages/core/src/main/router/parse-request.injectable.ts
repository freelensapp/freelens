import Subtext from "@hapi/subtext";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

export type ParseRequest = typeof Subtext.parse;

const parseRequestInjectable = getInjectable({
  id: "parse-http-request",
  instantiate: () => Subtext.parse,
});

export default parseRequestInjectable;
