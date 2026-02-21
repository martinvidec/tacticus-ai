'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@tremor/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = 'Anfrage an den Cogitator...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled && !isStreaming) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--background-start-rgb),0.5)] px-4 py-3 text-sm text-[rgb(var(--foreground))] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-color))] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {isStreaming && onStop ? (
        <Button
          type="button"
          onClick={onStop}
          className="flex-shrink-0 bg-thematic-red border-thematic-red hover:bg-red-700"
          icon={Square}
        >
          Stop
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={!input.trim() || disabled}
          className="flex-shrink-0"
          icon={Send}
        >
          Senden
        </Button>
      )}
    </form>
  );
}
