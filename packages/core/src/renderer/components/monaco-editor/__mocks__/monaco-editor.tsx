/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { monacoValidators } from "../monaco-validators";

import type { editor } from "monaco-editor";

import type { MonacoEditorProps, MonacoEditorRef } from "../monaco-editor";

class FakeMonacoEditor extends React.Component<MonacoEditorProps> {
  render() {
    const { id, value, onChange, onError, language = "yaml", readOnly } = this.props;

    return (
      <textarea
        data-testid={`monaco-editor-for-${id}`}
        onChange={(event) => {
          const newValue = event.target.value;

          onChange?.(newValue, {} as editor.IModelContentChangedEvent);

          const validator = monacoValidators[language];

          try {
            validator(newValue);
          } catch (e) {
            onError?.(e);
          }
        }}
        value={value}
        readOnly={readOnly}
      />
    );
  }
}

export const MonacoEditor = React.forwardRef<MonacoEditorRef, MonacoEditorProps>((props, ref) => (
  <FakeMonacoEditor innerRef={ref} {...props} />
));
