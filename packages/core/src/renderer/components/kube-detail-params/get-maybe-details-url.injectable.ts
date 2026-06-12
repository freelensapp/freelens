/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import getDetailsUrlInjectable from "./get-details-url.injectable";

export type GetMaybeDetailsUrl = (selfLink?: string) => string;

const getMaybeDetailsUrlInjectable = getInjectable({
  id: "get-maybe-details-url",
  instantiate: (di): GetMaybeDetailsUrl => {
    const getDetailsUrl = di.inject(getDetailsUrlInjectable);

    return (selfLink) => {
      if (selfLink) {
        return getDetailsUrl(selfLink);
      } else {
        return "";
      }
    };
  },
});

export default getMaybeDetailsUrlInjectable;
