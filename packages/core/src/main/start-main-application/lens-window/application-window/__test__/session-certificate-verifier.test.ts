/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import lensProxyCertificateInjectable from "../../../../../common/certificate/lens-proxy-certificate.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import sessionCertificateVerifierInjectable, { ChromiumNetError } from "../session-certificate-verifier.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

// A static self-signed certificate is used instead of generating one at test
// time: selfsigned v5 only exposes an async, native WebCrypto based API and
// generating real keys inside a vitest worker can crash the worker at teardown.
const lensProxyCertificate = `-----BEGIN CERTIFICATE-----
MIIDdTCCAl2gAwIBAgIUKCuayowKL/ZUl07QWi5CIBSl8o4wDQYJKoZIhvcNAQEL
BQAwPDEnMCUGA1UEAwweRnJlZWxlbnMgQ2VydGlmaWNhdGUgQXV0aG9yaXR5MREw
DwYDVQQKDAhGcmVlbGVuczAeFw0yNjA3MTcyMjEwNDhaFw0zNjA3MTQyMjEwNDha
MDwxJzAlBgNVBAMMHkZyZWVsZW5zIENlcnRpZmljYXRlIEF1dGhvcml0eTERMA8G
A1UECgwIRnJlZWxlbnMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCm
0pPFhhI1RfZ4cM23uF+zFceRsWnsYbfeSftQWTz7oGve7NyqUBQ9Z5N1yShoOjuh
T81Xl1zjuo7vAAPRUmCvBFQLPS//eLNTGFwcWczDdm2fmfXfz8mBB+KQ7tt1zAbx
B5yoE1kLnwxpaAOE0SkMWLcOREHOjJk8Jb/AIxS/FsWtm6K8/kKTjNp9iWhwW8Ma
J8+v6zqGlmQjbxFs6qjxP6B4tPqSV8FrdSMt61s57abQS9Wi3n4luBEamzkJkgoP
T/mgIT3lO25Ip6jytT+KTdkA5SD1yTePzi2Y+8VAMntGghyVJ+Gejw6SabiMhnaf
pmmqxXDYaxp/ultfSdI3AgMBAAGjbzBtMB0GA1UdDgQWBBQNi1VvG3NB0hspScFy
BM1WyfEaMjAfBgNVHSMEGDAWgBQNi1VvG3NB0hspScFyBM1WyfEaMjAPBgNVHRMB
Af8EBTADAQH/MBoGA1UdEQQTMBGCCWxvY2FsaG9zdIcEfwAAATANBgkqhkiG9w0B
AQsFAAOCAQEAHlV6sMiBW/n8K+amBgxotEvJagSiF/Gx3CzPdDreH9e2P3GsVE3e
aKXaMv1jl4E0SvJm6LTf/3Kjz1Sbv4TOVJVqFyK3YYztwZ/p81ms0YfYHuwShNx5
m03MJs7dli36wiqfT8MNLzkh+cWy5VojR1tSzGhXsfRlxIJj+hbrnuBKe+jahj/O
Ef6xmNU788sLHzGH8tUYA0QTMcVIu0LoYL+4YWkwME7pUOyfyabYSmjERY0zko2g
C9q1ALvRxWfNPOEvN88lV0AG7EcE35OOXalNATxPPEGVWrJo6Po2W2APYZcEM71r
6Zi4mGlYgfGcuEht2es7Cu9TQBKeyApFdQ==
-----END CERTIFICATE-----`;

const externalCertificate = `-----BEGIN CERTIFICATE-----
MIIFzzCCBLegAwIBAgIQByL1wEn7yGRLqHZvmBzvpTANBgkqhkiG9w0BAQsFADA8
MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRwwGgYDVQQDExNBbWF6b24g
UlNBIDIwNDggTTAyMB4XDTIzMDIwOTAwMDAwMFoXDTIzMTAxNDIzNTk1OVowFjEU
MBIGA1UEAxMLazhzbGVucy5kZXYwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQDNdPm5tKztUpgHgDHjktelNvRsaj4QHTzShUP5p2uGu+lNHhPByp3+fp8p
v6V4PhRyH006RcyvUkQlEOiprP0fF/L16Jlrlo13N7hspVS4drlxE0v4JcLxBKm8
pwsv7bfeZ7g6SWKA/0wbSTk8AyL0rCgcpMUWyPloq3gInO1x7kazgCAgrB34CSdj
JyD1Y8Od8eH8C9qdRlTcV0rG8y2np8YbK1lF77CXjD2feGjiUAMUAtArGKCZOc33
erdhvXgJQ1/SgWcEbbhEZ7j8cfH6y7hPPmU43epyePvY0SZ7x1PBt870W1LjG6lq
pfzqxVVxmT6Txiktnd/6cHCzfxjbAgMBAAGjggLxMIIC7TAfBgNVHSMEGDAWgBTA
MVLNWlDDgnx0cc7L6Zz5euuC4jAdBgNVHQ4EFgQUcC3Qdy61LUiE9hOvDJGYC/yt
fu0wJQYDVR0RBB4wHIILazhzbGVucy5kZXaCDSouazhzbGVucy5kZXYwDgYDVR0P
AQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjA7BgNVHR8E
NDAyMDCgLqAshipodHRwOi8vY3JsLnIybTAyLmFtYXpvbnRydXN0LmNvbS9yMm0w
Mi5jcmwwEwYDVR0gBAwwCjAIBgZngQwBAgEwdQYIKwYBBQUHAQEEaTBnMC0GCCsG
AQUFBzABhiFodHRwOi8vb2NzcC5yMm0wMi5hbWF6b250cnVzdC5jb20wNgYIKwYB
BQUHMAKGKmh0dHA6Ly9jcnQucjJtMDIuYW1hem9udHJ1c3QuY29tL3IybTAyLmNl
cjAMBgNVHRMBAf8EAjAAMIIBfAYKKwYBBAHWeQIEAgSCAWwEggFoAWYAdQDoPtDa
PvUGNTLnVyi8iWvJA9PL0RFr7Otp4Xd9bQa9bgAAAYY4etOIAAAEAwBGMEQCIGT/
/BWgTcOFQdzEX2qKlArMTvMwXggEY+m4ervIFLFnAiAyuX0I9jbGBI1XBiQ2mjXT
FIGw3TMF5b4rrCwhkRBG/gB1ALNzdwfhhFD4Y4bWBancEQlKeS2xZwwLh9zwAw55
NqWaAAABhjh6084AAAQDAEYwRAIgewezL8S3+qwozF4fNt+0FiV95luazD1yKb35
ZeOqudACIC7eFoZsaySOOivbqIp+nr9PB3qD08C1VKoi/LmnDp+3AHYAtz77JN+c
Tbp18jnFulj0bF38Qs96nzXEnh0JgSXttJkAAAGGOHrTlgAABAMARzBFAiAmZyNU
1H54FbGdwwXVXPxNYVE3MUlHswkR56WvWkvJ0wIhAJELvOBDIsCJ5uxTam2Xaxe0
nZ+YTVzXDoQAfHplV1N6MA0GCSqGSIb3DQEBCwUAA4IBAQAghl2vkfW4Gph6Ez/v
EA/INeDXSErm/o3zBv4uTS7kuINPAtTlDtVJW/usw++F5fmgjmyNVc94y35hFG9Q
8LTDgJWvxekmiJJ+FCAxbpkhqXjHhugXwoUvAKktpyFnw+1cliYeA01EevOhnN+n
ux6vjEyhhEZm/JV/TXWaNSmVprXRXwc1m5dQzEEqkXgIhhhSK7E/63L+Zm548cjp
LAp+pJnaHfg0a83QnPWyZeyob+GklQjEdx64i+7wAhhpUp1Ge2TnFfs6zQGv2Y7/
mgyzhHkKlUwQb5pi0rgR4oqKhnItyXjWqN3Y3wefTJblIs2sxEtYEzBUwlQZ3YM/
ycM4
-----END CERTIFICATE-----`;

describe("sessionCertificateVerifier", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.override(lensProxyCertificateInjectable, () => ({
      get: () => ({ cert: lensProxyCertificate, public: "", private: "" }),
      set: () => {},
    }));
  });

  it("marks lens proxy certificate as trusted", () => {
    const sessionCertificateVerifier = di.inject(sessionCertificateVerifierInjectable);
    const callback = vi.fn();

    sessionCertificateVerifier(
      {
        certificate: { data: lensProxyCertificate },
      } as any,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(ChromiumNetError.SUCCESS);
  });

  it("passes verification to chromium on non lens proxy certificate", () => {
    const sessionCertificateVerifier = di.inject(sessionCertificateVerifierInjectable);
    const callback = vi.fn();

    sessionCertificateVerifier(
      {
        certificate: { data: externalCertificate },
      } as any,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(ChromiumNetError.RESULT_FROM_CHROMIUM);
  });
});
