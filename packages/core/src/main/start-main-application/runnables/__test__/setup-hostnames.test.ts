/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { rootCertificates } from "node:tls";
import lensProxyCertificateInjectable from "../../../../common/certificate/lens-proxy-certificate.injectable";
import electronAppInjectable from "../../../electron-app/electron-app.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import setupHostnamesInjectable, { getCertificateSpkiFingerprint } from "../setup-hostnames.injectable";
import setupLensProxyCertificateInjectable from "../setup-lens-proxy-certificate.injectable";

import type { App } from "electron";

describe("setupHostnames", () => {
  it("configures Chromium with the renderer proxy public key", () => {
    const di = getDiForUnitTesting();
    const appendSwitch = vi.fn();
    const certificate = rootCertificates[0];

    di.override(electronAppInjectable, () => ({ commandLine: { appendSwitch } }) as unknown as App);
    di.override(lensProxyCertificateInjectable, () => ({
      get: () => ({ cert: certificate, private: "", public: "" }),
      set: vi.fn(),
    }));

    const setupHostnames = di.inject(setupHostnamesInjectable);

    setupHostnames.run();

    expect(appendSwitch).toHaveBeenCalledWith(
      "ignore-certificate-errors-spki-list",
      getCertificateSpkiFingerprint(certificate),
    );
    expect(setupHostnames.runAfter).toBe(setupLensProxyCertificateInjectable);
  });
});
