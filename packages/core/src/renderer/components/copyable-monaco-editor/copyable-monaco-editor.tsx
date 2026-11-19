/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./copyable-monaco-editor.scss";

import { cssNames } from "@freelensapp/utilities";
import { useEffect, useRef } from "react";
import { CopyToClipboardIcon } from "../copy-to-clipboard/copy-to-clipboard-icon";
import { MonacoEditor } from "../monaco-editor";

import type { MonacoEditorProps } from "../monaco-editor";

export interface CopyableMonacoEditorProps extends MonacoEditorProps {
  "data-testid"?: string;
}

/**
 * A `MonacoEditor` with an icon next to its top-right corner that copies the
 * content of the editor to the clipboard. The icon sits outside the editor, so
 * it covers neither the text, the minimap nor the scrollbar.
 *
 * It copies what the editor shows: the last value given to it, or the last
 * edit made in it, whichever came later.
 */
export const CopyableMonacoEditor = ({
  className,
  onChange,
  "data-testid": testId,
  ...props
}: CopyableMonacoEditorProps) => {
  const content = useRef(props.value);

  // The editor shows a new value as soon as it is given one.
  useEffect(() => {
    content.current = props.value;
  }, [props.value]);

  return (
    <div className="CopyableMonacoEditor" data-testid={testId}>
      <MonacoEditor
        {...props}
        className={cssNames("CopyableMonacoEditor-editor", className)}
        onChange={(value, event) => {
          content.current = value;
          onChange?.(value, event);
        }}
      />
      <CopyToClipboardIcon getText={() => content.current} data-testid={testId ? `${testId}-copy` : undefined} />
    </div>
  );
};
