/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { timingSafeEqual, X509Certificate } from "node:crypto";
import { getInjectable } from "@ogre-tools/injectable";
import freelensProxyCertificateInjectable from "../../../../common/certificate/freelens-proxy-certificate.injectable";

import type { Request } from "electron";

// see https://www.electronjs.org/docs/latest/api/session#sessetcertificateverifyprocproc
export enum ChromiumNetError {
  SUCCESS = 0,
  FAILURE = -2,
  RESULT_FROM_CHROMIUM = -3,
}

export type CertificateVerificationCallback = (error: ChromiumNetError) => void;

const sessionCertificateVerifierInjectable = getInjectable({
  id: "session-certificate-verifier",
  instantiate: (di) => {
    const freelensProxyCertificate = di.inject(freelensProxyCertificateInjectable).get();
    const freelensProxyX509Cert = new X509Certificate(freelensProxyCertificate.cert);

    return (request: Request, shouldBeTrusted: CertificateVerificationCallback) => {
      const { certificate } = request;
      const cert = new X509Certificate(certificate.data);
      const shouldTrustCert =
        cert.raw.length === freelensProxyX509Cert.raw.length && timingSafeEqual(cert.raw, freelensProxyX509Cert.raw);

      shouldBeTrusted(shouldTrustCert ? ChromiumNetError.SUCCESS : ChromiumNetError.RESULT_FROM_CHROMIUM);
    };
  },
});

export default sessionCertificateVerifierInjectable;
