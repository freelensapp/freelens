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

/**
 * What an error says has failed: installing, or, over an enabled extension
 * which was disabled for it, reinstalling the same build or replacing it with
 * another one. Only the caller knows which of the two it was: the same version
 * from another source, a directory in place of a managed install or the other
 * way round, is a replacement.
 */
export const installFailureSubject = (name: string, version: string, disabledVersion?: string, isReinstall = false) => {
  if (!disabledVersion) {
    return (
      <>
        {"Installing extension "}
        <b>{`${name}@${version}`}</b>
      </>
    );
  }

  if (isReinstall) {
    return (
      <>
        {"Reinstalling "}
        <b>{name}</b>
      </>
    );
  }

  return (
    <>
      {"Replacing "}
      <b>{`${name}@${disabledVersion}`}</b>
      {" with "}
      <b>{`${name}@${version}`}</b>
    </>
  );
};
