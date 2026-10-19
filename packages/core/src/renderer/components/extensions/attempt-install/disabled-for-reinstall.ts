/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * What a failed reinstall adds to its error: the extension was disabled to be
 * replaced, and nothing enables it again. Which build is installed afterwards
 * depends on how far the install got, so the note does not say.
 */
export const disabledForReinstallNote = (name: string, disabledVersion: string) =>
  `${name}@${disabledVersion} was disabled to be replaced, and ${name} stays disabled until it is enabled again in the list of extensions.`;
