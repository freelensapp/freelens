/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames, noop } from "@freelensapp/utilities";
import { useEffect, useRef, useState } from "react";

export interface CopyToClipboardIconProps {
  /**
   * Returns the text to copy. It is called on each click, so that the text is
   * the one shown at that moment, unsaved edits included.
   */
  getText: () => string;
  className?: string;
  "data-testid"?: string;
}

/**
 * How long the icon shows that the text was copied.
 */
export const copiedFeedbackDuration = 3000;

/**
 * An icon that copies a text to the clipboard, and shows "Copied!" for a few
 * seconds when the write succeeds. A refused write leaves the "Copy" tooltip in
 * place, which is the feedback.
 */
export const CopyToClipboardIcon = ({ getText, className, "data-testid": testId }: CopyToClipboardIconProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(getText()).then(() => {
      if (!isMounted.current) {
        return;
      }

      clearTimeout(timer.current);
      setIsCopied(true);
      timer.current = setTimeout(() => setIsCopied(false), copiedFeedbackDuration);
    }, noop);
  };

  const label = isCopied ? "Copied!" : "Copy";

  return (
    <Icon
      className={cssNames("CopyToClipboardIcon", className)}
      material={isCopied ? "done" : "content_copy"}
      tooltip={label}
      aria-label={label}
      onClick={copy}
      data-testid={testId}
    />
  );
};
