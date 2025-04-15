/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { applicationInformationToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";

const applicationCopyrightInjectable = getInjectable({
  id: "application-copyright",
  instantiate: (di) => di.inject(applicationInformationToken).copyright,
});

export default applicationCopyrightInjectable;
