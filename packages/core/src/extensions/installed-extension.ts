/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The name from an extension's manifest. It identifies the extension across
 * versions and across installs, which a path cannot: an upgrade moves the
 * files.
 */
export type LensExtensionId = string;

export type LensExtensionConstructor = new (ext: InstalledExtension) => LensExtensionInstance;

export interface InstalledExtension {
  /**
   * Identifies the extension independently of the version installed: the name
   * from its manifest, e.g. "@freelensapp/helloworld".
   */
  readonly id: LensExtensionId;
  /**
   * Absolute path to the directory holding the extension's files. For a managed
   * install this is the live build,
   * e.g. "<userData>/extensions/freelensapp--helloworld/1.0.0-0f1e2d3c"; for a
   * development install it is the directory registered in place.
   */
  readonly absolutePath: string;
  /** Absolute path to the extension's manifest, inside `absolutePath`. */
  readonly manifestPath: string;
  readonly manifest: LensExtensionManifest;
  readonly isCompatible: boolean;
  /**
   * False for a development install: a directory registered in place, whose
   * content can change under the application. Such an extension carries no
   * `<version>-<digest>` path segment, which is what marks it.
   */
  readonly isManaged: boolean;
  /**
   * True when the tarball this extension was extracted from was checked against
   * a checksum at install time. Always false for a development install, which
   * is unverified by construction.
   *
   * Verification happens at install and is not repeated at load, so this
   * records what was done then, not a claim about the files on disk now.
   */
  readonly isVerified: boolean;
  isEnabled: boolean;
}

export interface LensExtensionInstance {
  readonly id: LensExtensionId;
  readonly manifest: LensExtensionManifest;
  readonly manifestPath: string;
  readonly sanitizedExtensionId: string;
  readonly name: string;
  readonly version: string;
  readonly description: string | undefined;
  readonly storeName: string;

  getExtensionFileFolder(): Promise<string>;
  enable(): Promise<void>;
  disable(): Promise<void>;
  activate(): Promise<void>;
}

export interface LensExtensionManifest {
  name: string;
  version: string;
  description?: string;
  publishConfig?: Partial<Record<string, string>>;

  /**
   * Specify extension name used for persisting data.
   * Useful if extension is renamed but the data should not be lost.
   */
  storeName?: string;

  main?: string; // path to %ext/dist/main.js
  renderer?: string; // path to %ext/dist/renderer.js

  /**
   * The module format of the extension's own `.js` files, as npm defines it.
   * Absent means `"commonjs"`, which is npm's default and not this project's
   * preference. Only the `main` entry point is affected: a renderer entry point
   * is ESM by contract, being served over a scheme and imported as a module.
   */
  type?: "module" | "commonjs";

  /**
   * Supported Lens version engine by extension could be defined in `manifest.engines.freelens`
   * Only MAJOR.MINOR version is taken in consideration.
   */
  engines: {
    freelens: string; // "semver"-package format
    [x: string]: string | undefined;
  };
}
