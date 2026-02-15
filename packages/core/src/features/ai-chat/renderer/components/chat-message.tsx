/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./chat-message.scss";

import { cssNames } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import React from "react";

import type { ConversationMessage } from "../stores/conversation-store.injectable";

export interface ChatMessageProps {
  message: ConversationMessage;
  isStreaming?: boolean;
}

export const ChatMessage = observer(({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool) {
    return (
      <div className="AiChatMessage tool" data-testid="chat-message-tool">
        <div className="toolHeader">
          {message.toolResults?.[0]?.toolName && (
            <span className="toolName">{message.toolResults[0].toolName}</span>
          )}
          <span className="toolStatus">
            {message.isError ? "failed" : "completed"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cssNames("AiChatMessage", {
        user: isUser,
        assistant: !isUser,
        error: message.isError,
      })}
      data-testid={`chat-message-${message.role}`}
    >
      <div className="content">
        {message.content}
        {!isUser && isStreaming && !message.content && (
          <span className="loadingDots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        )}
        {!isUser && isStreaming && message.content && (
          <span className="cursor" />
        )}
      </div>

      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="toolCalls">
          {message.toolCalls.map((tc) => (
            <div key={tc.toolCallId} className="toolCall">
              <span className="toolCallName">{tc.toolName}</span>
            </div>
          ))}
        </div>
      )}

      {message.pendingConfirmation && (
        <div className="confirmation">
          <p>{message.pendingConfirmation.description}</p>
          <div className="confirmationActions">
            <button className="confirmBtn">Confirm</button>
            <button className="declineBtn">Decline</button>
          </div>
        </div>
      )}
    </div>
  );
});
