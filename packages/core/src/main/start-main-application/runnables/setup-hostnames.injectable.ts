/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash, X509Certificate } from "node:crypto";
import { beforeElectronIsReadyInjectionToken } from "@freelensapp/application-for-electron-main";
import { getInjectable } from "@ogre-tools/injectable";
import lensProxyCertificateInjectable from "../../../common/certificate/lens-proxy-certificate.injectable";
import electronAppInjectable from "../../electron-app/electron-app.injectable";
import setupLensProxyCertificateInjectable from "./setup-lens-proxy-certificate.injectable";

export const getCertificateSpkiFingerprint = (certificate: string): string => {
  const publicKey = new X509Certificate(certificate).publicKey.export({
    type: "spki",
    format: "der",
  });

  return createHash("sha256").update(publicKey).digest("base64");
};

const setupHostnamesInjectable = getInjectable({
  id: "setup-hostnames",

  instantiate: (di) => ({
    run: () => {
      const app = di.inject(electronAppInjectable);
      const lensProxyCertificate = di.inject(lensProxyCertificateInjectable).get();

      app.commandLine.appendSwitch(
        "host-resolver-rules",
        [
          "MAP localhost 127.0.0.1",
          "MAP renderer.freelens.app 127.0.0.1",
          "MAP *.renderer.freelens.app 127.0.0.1",
        ].join(),
      );

      // Chromium's platform certificate verifier can hang before Electron's
      // setCertificateVerifyProc callback is reached. Trust only the ephemeral
      // public key generated for this process's loopback renderer proxy.
      app.commandLine.appendSwitch(
        "ignore-certificate-errors-spki-list",
        getCertificateSpkiFingerprint(lensProxyCertificate.cert),
      );

      // NOTE: Proxy bypass is configured via session.setProxy() to preserve external proxy access

      return undefined;
    },
    runAfter: setupLensProxyCertificateInjectable,
  }),

  injectionToken: beforeElectronIsReadyInjectionToken,
});

export default setupHostnamesInjectable;
