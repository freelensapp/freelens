/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { applicationInformationToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import isDevelopmentInjectable from "./is-development.injectable";

// In dev mode the renderer is served by the Vite dev server, whose
// @vitejs/plugin-react injects an inline `<script type="module">` react-refresh
// preamble into the HTML. The production CSP (`script-src 'unsafe-eval' 'self'`)
// blocks that inline script, so the preamble never runs and every decorated
// React module throws "@vitejs/plugin-react can't detect preamble", leaving the
// app stuck on the splash screen. Allow 'unsafe-inline' scripts in development
// only so the HMR preamble executes; the packaged build keeps the strict CSP.
const withUnsafeInlineScripts = (csp: string): string =>
  csp
    .split(";")
    .map((directive) => {
      const trimmed = directive.trim();
      return /^script-src\b/.test(trimmed) ? `${trimmed} 'unsafe-inline'` : directive;
    })
    .join(";");

const contentSecurityPolicyInjectable = getInjectable({
  id: "content-security-policy",
  instantiate: (di) => {
    const contentSecurityPolicy = di.inject(applicationInformationToken).contentSecurityPolicy;

    return di.inject(isDevelopmentInjectable) ? withUnsafeInlineScripts(contentSecurityPolicy) : contentSecurityPolicy;
  },
});

export default contentSecurityPolicyInjectable;
