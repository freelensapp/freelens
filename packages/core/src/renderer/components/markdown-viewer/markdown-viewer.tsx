/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Wrapper Component with marked plugin in its core
// Source: https://www.npmjs.com/package/marked
import "./markdown-viewer.scss";

import { cssNames } from "@freelensapp/utilities";
import DOMPurify from "dompurify";
import { marked } from "marked";
import React, { Component } from "react";

DOMPurify.addHook("afterSanitizeAttributes", function (node) {
  // Set all elements owning target to target=_blank
  if ("target" in node) {
    node.setAttribute("target", "_blank");
  }
});

export interface MarkdownViewerProps extends OptionalProps {
  markdown: string;
}

export interface OptionalProps {
  className?: string;
}

export class MarkdownViewer extends Component<MarkdownViewerProps> {
  render() {
    const { className, markdown } = this.props;
    const html = DOMPurify.sanitize(marked.parse(markdown) as string);

    return <div className={cssNames("MarkDownViewer", className)} dangerouslySetInnerHTML={{ __html: html }} />;
  }
}
