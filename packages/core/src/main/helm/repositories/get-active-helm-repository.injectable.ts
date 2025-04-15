/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import { getInjectable } from "@ogre-tools/injectable";
import getActiveHelmRepositoriesInjectable from "./get-active-helm-repositories/get-active-helm-repositories.injectable";

const getActiveHelmRepositoryInjectable = getInjectable({
  id: "get-active-helm-repository",

  instantiate: (di) => {
    const getActiveHelmRepositories = di.inject(getActiveHelmRepositoriesInjectable);

    return async (name: string) => {
      const activeHelmRepositories = await getActiveHelmRepositories();

      assert(activeHelmRepositories.callWasSuccessful);

      return activeHelmRepositories.response.find((repository) => repository.name === name);
    };
  },
});

export default getActiveHelmRepositoryInjectable;
