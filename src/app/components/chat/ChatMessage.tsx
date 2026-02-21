'use client';

import React from 'react';
import { User, Bot } from 'lucide-react';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 p-4 ${
        isUser
          ? 'bg-[rgba(var(--background-end-rgb),0.3)]'
          : 'bg-[rgba(var(--primary-color),0.05)]'
      } rounded-lg border border-[rgb(var(--border-color))]`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-[rgba(var(--primary-color),0.2)]'
            : 'bg-[rgba(160,50,50,0.2)]'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[rgb(var(--primary-color))]" />
        ) : (
          <Bot className="w-4 h-4 text-thematic-red" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-sm font-medium ${
              isUser ? 'text-[rgb(var(--primary-color))]' : 'text-thematic-red'
            }`}
          >
            {isUser ? 'Commander' : 'Cogitator'}
          </span>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="text-sm text-[rgb(var(--foreground))] whitespace-pre-wrap break-words">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-[rgb(var(--primary-color))] animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
