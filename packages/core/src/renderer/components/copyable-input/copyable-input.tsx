/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./copyable-input.scss";

import { cssNames } from "@freelensapp/utilities";
import { useEffect, useRef } from "react";
import { CopyToClipboardIcon } from "../copy-to-clipboard/copy-to-clipboard-icon";
import { Input } from "../input";

import type { ReactNode } from "react";

import type { InputProps } from "../input";

export type CopyableInputProps = InputProps & {
  /**
   * Turns what the input shows into the text to copy, such as a value it shows
   * encoded. By default the text is what the input shows.
   */
  getTextToCopy?: (value: string) => string;
  /**
   * Shown between the input and the copy icon, such as more icons of the input.
   */
  children?: ReactNode;
  "data-testid"?: string;
};

/**
 * An `Input` with an icon after it that copies its content to the clipboard.
 *
 * It copies what the input shows: the last value given to it, or the last edit
 * made in it, whichever came later.
 */
export const CopyableInput = ({
  className,
  onChange,
  getTextToCopy = (value) => value,
  children,
  "data-testid": testId,
  ...props
}: CopyableInputProps) => {
  const content = useRef(props.value ?? props.defaultValue ?? "");

  // The input shows a new value as soon as it is given one.
  useEffect(() => {
    if (props.value !== undefined) {
      content.current = props.value;
    }
  }, [props.value]);

  return (
    <div className="CopyableInput" data-testid={testId}>
      <Input
        {...props}
        className={cssNames("CopyableInput-input", className)}
        onChange={(value, event) => {
          content.current = value;
          onChange?.(value, event);
        }}
      />
      {children}
      <CopyToClipboardIcon
        getText={() => getTextToCopy(content.current)}
        data-testid={testId ? `${testId}-copy` : undefined}
      />
    </div>
  );
};
