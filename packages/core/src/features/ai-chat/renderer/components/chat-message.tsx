/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./chat-message.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { observer } from "mobx-react";
import React, { useCallback, useState } from "react";

import type { ConversationMessage } from "../stores/conversation-store.injectable";

export interface ChatMessageProps {
  message: ConversationMessage;
  isStreaming?: boolean;
}

/**
 * Render markdown content to sanitized HTML.
 */
function renderMarkdown(content: string): string {
  return DOMPurify.sanitize(marked.parse(content) as string);
}

export const ChatMessage = observer(({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [message.content]);

  // Tool messages render as compact inline chips
  if (isTool) {
    const toolName = message.toolResults?.[0]?.toolName;
    const failed = message.isError;

    return (
      <div
        className={cssNames("AiChatMessage__tool-chip", { error: failed })}
        data-testid="chat-message-tool"
      >
        <Icon material={failed ? "error_outline" : "check_circle"} smallest />
        <span className="AiChatMessage__tool-chip-name">
          {toolName || "tool"}
        </span>
        <span className="AiChatMessage__tool-chip-status">
          {failed ? "failed" : "done"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cssNames("AiChatMessage", {
        "AiChatMessage--user": isUser,
        "AiChatMessage--assistant": !isUser,
        "AiChatMessage--error": message.isError,
      })}
      data-testid={`chat-message-${message.role}`}
    >
      {/* Content */}
      <div className="AiChatMessage__content">
        {isUser ? (
          // User messages are plain text
          message.content
        ) : message.content ? (
          // Assistant messages render as markdown
          <div
            className="AiChatMessage__markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : null}

        {/* Streaming indicators */}
        {!isUser && isStreaming && !message.content && (
          <div className="AiChatMessage__typing">
            <span /><span /><span />
          </div>
        )}
        {!isUser && isStreaming && message.content && (
          <span className="AiChatMessage__cursor" />
        )}
      </div>

      {/* Tool call chips (inline in assistant message) */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="AiChatMessage__tool-calls">
          {message.toolCalls.map((tc) => (
            <span key={tc.toolCallId} className="AiChatMessage__tool-call-badge">
              <Icon material="build" smallest />
              {tc.toolName}
            </span>
          ))}
        </div>
      )}

      {/* Copy button for assistant messages */}
      {!isUser && message.content && !isStreaming && (
        <button
          className="AiChatMessage__copy"
          onClick={handleCopy}
          aria-label="Copy message"
          title={copied ? "Copied!" : "Copy"}
        >
          <Icon material={copied ? "check" : "content_copy"} smallest />
        </button>
      )}

      {/* Pending confirmation (Phase 6) */}
      {message.pendingConfirmation && (
        <div className="AiChatMessage__confirmation">
          <p>{message.pendingConfirmation.description}</p>
          <div className="AiChatMessage__confirmation-actions">
            <button className="AiChatMessage__confirm-btn">Confirm</button>
            <button className="AiChatMessage__decline-btn">Decline</button>
          </div>
        </div>
      )}
    </div>
  );
});
