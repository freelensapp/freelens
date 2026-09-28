/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { generate } from "selfsigned";

import type { SelfSignedCert } from "../../common/certificate/certificate";

const notAfterDateInOneYear = () => {
  const notAfterDate = new Date();
  notAfterDate.setFullYear(notAfterDate.getFullYear() + 1);

  return notAfterDate;
};

const kubeAuthProxyCertificateInjectable = getInjectable({
  id: "kube-auth-proxy-certificate",
  instantiate: (di, hostname): Promise<SelfSignedCert> =>
    // selfsigned v5 returns a Promise and dropped the `days` option in favor of
    // explicit dates; consumers await this injectable.
    generate(
      [
        { name: "commonName", value: "Freelens Certificate Authority" },
        { name: "organizationName", value: "Freelens" },
      ],
      {
        keySize: 2048,
        algorithm: "sha256",
        notAfterDate: notAfterDateInOneYear(),
        extensions: [
          { name: "basicConstraints", cA: true },
          {
            name: "subjectAltName",
            altNames: [
              { type: 2, value: hostname },
              { type: 2, value: "localhost" },
              { type: 7, ip: "127.0.0.1" },
            ],
          },
        ],
      },
    ),
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, hostname: string) => hostname,
  }),
});

export default kubeAuthProxyCertificateInjectable;
