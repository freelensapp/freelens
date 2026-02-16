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
import React, { useCallback, useMemo, useState } from "react";

import type { AiToolResult } from "../../common/types";
import type { ConversationMessage } from "../stores/conversation-store.injectable";

export interface ChatMessageProps {
  message: ConversationMessage;
  isStreaming?: boolean;
  toolResults?: AiToolResult[];
}

/**
 * Render markdown content to sanitized HTML.
 */
function renderMarkdown(content: string): string {
  return DOMPurify.sanitize(marked.parse(content) as string);
}

/**
 * Summarize tool call input into a short param string.
 * E.g. { kind: "Namespace" } → "kind: Namespace"
 */
function summarizeToolInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";

  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);

  return entries.join(", ");
}

export const ChatMessage = observer(({ message, isStreaming, toolResults }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [message.content]);

  const hasReasoning = message.reasoning.length > 0;
  const isThinkingInProgress = isStreaming && hasReasoning && !message.content;

  const reasoningHtml = useMemo(() => {
    if (!hasReasoning) return "";

    return renderMarkdown(message.reasoning);
  }, [hasReasoning, message.reasoning]);

  // Build a lookup from toolCallId → result for status display
  const toolResultMap = useMemo(() => {
    if (!toolResults?.length) return undefined;
    const map = new Map<string, AiToolResult>();

    for (const tr of toolResults) {
      map.set(tr.toolCallId, tr);
    }

    return map;
  }, [toolResults]);

  return (
    <div
      className={cssNames("AiChatMessage", {
        "AiChatMessage--user": isUser,
        "AiChatMessage--assistant": !isUser,
        "AiChatMessage--error": message.isError,
      })}
      data-testid={`chat-message-${message.role}`}
    >
      {!isUser && hasReasoning && (
        <div className={cssNames("AiChatMessage__thinking", { expanded: thinkingExpanded || isThinkingInProgress })}>
          <button
            className="AiChatMessage__thinking-toggle"
            onClick={() => setThinkingExpanded((prev) => !prev)}
          >
            <Icon material={thinkingExpanded || isThinkingInProgress ? "expand_less" : "expand_more"} smallest />
            <span>{isThinkingInProgress ? "Thinking..." : "Thinking"}</span>
            {isThinkingInProgress && <span className="AiChatMessage__thinking-pulse" />}
          </button>
          {(thinkingExpanded || isThinkingInProgress) && (
            <div
              className="AiChatMessage__thinking-content AiChatMessage__markdown"
              dangerouslySetInnerHTML={{ __html: reasoningHtml }}
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="AiChatMessage__content">
        {isUser ? (
          message.content
        ) : message.content ? (
          <div
            className="AiChatMessage__markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : null}

        {!isUser && isStreaming && !message.content && !hasReasoning && (
          <div className="AiChatMessage__typing">
            <span /><span /><span />
          </div>
        )}
        {!isUser && isStreaming && message.content && (
          <span className="AiChatMessage__cursor" />
        )}
      </div>

      {/* Tool call badges with params and result status */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="AiChatMessage__tool-calls">
          {message.toolCalls.map((tc) => {
            const result = toolResultMap?.get(tc.toolCallId);
            const params = summarizeToolInput(tc.input);

            return (
              <span
                key={tc.toolCallId}
                className={cssNames("AiChatMessage__tool-call-badge", {
                  "AiChatMessage__tool-call-badge--done": result && !result.isError,
                  "AiChatMessage__tool-call-badge--error": result?.isError,
                })}
              >
                {result ? (
                  <Icon material={result.isError ? "error_outline" : "check_circle"} smallest />
                ) : (
                  <Icon material="hourglass_empty" smallest />
                )}
                <span className="AiChatMessage__tool-call-name">{tc.toolName}</span>
                {params && (
                  <span className="AiChatMessage__tool-call-params">{params}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

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

      {!isUser && !isStreaming && message.usage && (
        <div className="AiChatMessage__usage">
          {message.usage.inputTokens != null && (
            <span>In: {message.usage.inputTokens.toLocaleString()}</span>
          )}
          {message.usage.outputTokens != null && (
            <span>Out: {message.usage.outputTokens.toLocaleString()}</span>
          )}
          {message.usage.costUsd != null && (
            <span className="AiChatMessage__usage-cost">
              ${message.usage.costUsd < 0.01
                ? message.usage.costUsd.toFixed(4)
                : message.usage.costUsd.toFixed(2)}
            </span>
          )}
        </div>
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
