/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SelfSignedCert } from "../common/certificate/certificate";

/**
 * A certificate for TLS servers in unit tests, valid for `127.0.0.1` and the
 * renderer hosts, and its own CA. Tests that choose between HTTP/2 and
 * HTTP/1.1 through ALPN need a real TLS server, and the certificate of unit
 * tests is a placeholder. This one was made for tests only, with
 * `openssl req -x509 -newkey ec`: its key protects nothing. It is generated
 * ahead of time because generating keys inside a Vitest worker can crash the
 * worker at teardown.
 */
export const testCertificate: SelfSignedCert = {
  cert: `-----BEGIN CERTIFICATE-----
MIIB4jCCAYigAwIBAgIUNX6HxilPxIoumHygDgdlXj8GWDAwCgYIKoZIzj0EAwIw
JDEiMCAGA1UEAwwZRnJlZWxlbnMgdGVzdCBjZXJ0aWZpY2F0ZTAgFw0yNjEwMDMx
MjA1MzFaGA8yMTI2MDkwOTEyMDUzMVowJDEiMCAGA1UEAwwZRnJlZWxlbnMgdGVz
dCBjZXJ0aWZpY2F0ZTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABBuA47PQuI9Q
HWHiY897aJWFHMwvCi7ohSWaEwUqcoQ8AzL/q5ZOxQLST/7kPyZAY9Ja3ZL6mD+0
wGIh4hYteYGjgZUwgZIwHQYDVR0OBBYEFMBn+ApS+M2jGTTGV1p2RUp9utMmMB8G
A1UdIwQYMBaAFMBn+ApS+M2jGTTGV1p2RUp9utMmMA8GA1UdEwEB/wQFMAMBAf8w
PwYDVR0RBDgwNoIVcmVuZGVyZXIuZnJlZWxlbnMuYXBwghcqLnJlbmRlcmVyLmZy
ZWVsZW5zLmFwcIcEfwAAATAKBggqhkjOPQQDAgNIADBFAiEA7PpvR9DsxXAaFafD
0Vj0RNDa13ZvJaeZUtuCWZ/YYIgCIASDveKIahqYM+sn2wtcOLsnsrs+z8qg1S1y
IwI5cqTs
-----END CERTIFICATE-----`,
  private: `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgMzK6YmXo+/pfi+/3
mqufu4FJqWVZWcxYepT9H7s7bBWhRANCAAQbgOOz0LiPUB1h4mPPe2iVhRzMLwou
6IUlmhMFKnKEPAMy/6uWTsUC0k/+5D8mQGPSWt2S+pg/tMBiIeIWLXmB
-----END PRIVATE KEY-----`,
  public: "",
};
