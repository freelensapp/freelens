/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Style and asset imports survive declaration emit as side-effect imports
// (e.g. `import "./components/app.scss"` in core's renderer library). They
// carry no types, so `rollup.dts.config.mjs` resolves them to an empty module;
// this is the same statement for the API Extractor program, which type-checks
// `dist-types/` rather than bundling it.

declare module "*.css";
declare module "*.scss";
declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.ttf";
declare module "*.woff";
declare module "*.woff2";
declare module "*.eot";
