/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import { generate } from "selfsigned";
import lensProxyCertificateInjectable from "../../../common/certificate/lens-proxy-certificate.injectable";

const setupLensProxyCertificateInjectable = getInjectable({
  id: "setup-lens-proxy-certificate",

  instantiate: (di) => ({
    run: async () => {
      const lensProxyCertificate = di.inject(lensProxyCertificateInjectable);

      // selfsigned v5 dropped the `days` option in favor of explicit dates.
      const notAfterDate = new Date();
      notAfterDate.setFullYear(notAfterDate.getFullYear() + 1);

      const cert = await generate(
        [
          { name: "commonName", value: "Freelens Certificate Authority" },
          { name: "organizationName", value: "Freelens" },
        ],
        {
          keySize: 2048,
          algorithm: "sha256",
          notAfterDate,
          extensions: [
            {
              name: "basicConstraints",
              cA: true,
            },
            {
              name: "subjectAltName",
              altNames: [
                { type: 2, value: "*.renderer.freelens.app" },
                { type: 2, value: "renderer.freelens.app" },
                { type: 2, value: "localhost" },
                { type: 7, ip: "127.0.0.1" },
              ],
            },
          ],
        },
      );

      lensProxyCertificate.set(cert);
    },
  }),

  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default setupLensProxyCertificateInjectable;
