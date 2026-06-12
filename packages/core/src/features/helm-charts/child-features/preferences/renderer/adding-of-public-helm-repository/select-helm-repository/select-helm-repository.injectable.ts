/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import removeHelmRepositoryInjectable from "../../remove-helm-repository.injectable";
import addHelmRepositoryInjectable from "./add-helm-repository.injectable";

import type { SingleValue } from "react-select";

import type { HelmRepo } from "../../../../../../../common/helm/helm-repo";
import type { SelectOption } from "../../../../../../../renderer/components/select";

const selectHelmRepositoryInjectable = getInjectable({
  id: "select-helm-repository",

  instantiate: (di) => {
    const addHelmRepository = di.inject(addHelmRepositoryInjectable);
    const removeHelmRepository = di.inject(removeHelmRepositoryInjectable);

    return (selected: SingleValue<SelectOption<HelmRepo>>) => {
      if (!selected) {
        return;
      }

      if (!selected.isSelected) {
        addHelmRepository(selected.value);
      } else {
        removeHelmRepository(selected.value);
      }
    };
  },
});

export default selectHelmRepositoryInjectable;
