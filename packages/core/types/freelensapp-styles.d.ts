/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The @freelensapp/*/styles entries resolve to .scss sources and are imported
// only for their side effects; Vite handles them at build time. TypeScript 7
// checks side-effect imports (TS2882), so each specifier needs an ambient
// declaration. Wildcard module patterns allow a single asterisk, which
// "@freelensapp/*/styles" would exceed, so the specifiers are enumerated.
declare module "@freelensapp/animate/styles";
declare module "@freelensapp/button/styles";
declare module "@freelensapp/core/styles";
declare module "@freelensapp/error-boundary/styles";
declare module "@freelensapp/icon/styles";
declare module "@freelensapp/notifications/styles";
declare module "@freelensapp/resizing-anchor/styles";
declare module "@freelensapp/spinner/styles";
declare module "@freelensapp/tooltip/styles";
