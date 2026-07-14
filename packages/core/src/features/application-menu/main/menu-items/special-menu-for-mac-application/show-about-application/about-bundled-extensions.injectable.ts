/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { applicationInformationToken } from "@freelensapp/application";
import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import semanticBuildVersionInjectable from "../../../../../vars/common/semantic-build-version.injectable";

const specificVersionsInjectable = getInjectable({
  id: "specific-versions",
  instantiate: (di) => {
    const buildSemanticVersion = di.inject(semanticBuildVersionInjectable);
    const applicationInformation = di.inject(applicationInformationToken);

    if (buildSemanticVersion.prerelease[0] === "latest") {
      return [];
    }

    const corePackageVersions = object
      .entries(applicationInformation.dependencies)
      .filter(([name]) => name.startsWith("@freelensapp/"))
      .map(([name, version]) => `${name}: ${version}`);

    return corePackageVersions;
  },
});

export default specificVersionsInjectable;
