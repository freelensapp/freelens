/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Support import for custom module extensions
// https://www.typescriptlang.org/docs/handbook/modules.html#wildcard-module-declarations
declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
declare module "*.scss" {
  const content: string;
  export = content;
}

// Declare everything what's bundled as webpack's type="asset/resource"
// Should be mocked for tests support in jestConfig.moduleNameMapper (currently in "/package.json")
declare module "*.svg" {
  const content: string;
  export = content;
}

declare module "*.jpg";
declare module "*.png";
declare module "*.eot";
declare module "*.woff";
declare module "*.woff2";

declare module "*.ttf" {
  const content: string;
  export = content;
}

// Vite-specific import qualifiers (v2 build; see freelens/electron.vite.config.ts)
declare module "*.svg?raw" {
  const content: string;
  export default content;
}

declare module "*?worker" {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}
