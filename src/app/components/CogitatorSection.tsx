'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getClaudeApiKeyStatus, updateClaudeModel } from '@/lib/actions';
import { generateStatsExport, statsExportToString, StatsExport } from '@/lib/statsExporter';
import { PlayerDataResponse, GuildResponse, GuildRaidResponse } from '@/lib/types';
import { ClaudeModel, CLAUDE_MODELS } from '@/lib/validation';
import ChatMessage, { ChatMessageData } from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';
import ModelSelector from './chat/ModelSelector';
import { Card, Title, Text, Button } from '@tremor/react';
import { Bot, Settings, Trash2, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

interface CogitatorSectionProps {
  playerData: PlayerDataResponse | null;
  guildData: GuildResponse | null;
  allSeasonsRaidData: Record<number, GuildRaidResponse>;
  tacticusUserId: string | null;
}

export default function CogitatorSection({
  playerData,
  guildData,
  allSeasonsRaidData,
  tacticusUserId,
}: CogitatorSectionProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasClaudeKey, setHasClaudeKey] = useState<boolean | null>(null);
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>('claude-sonnet-4-20250514');
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check Claude API key status on mount
  useEffect(() => {
    const checkKeyStatus = async () => {
      if (!user) {
        setIsCheckingKey(false);
        return;
      }

      try {
        const status = await getClaudeApiKeyStatus(user.uid);
        setHasClaudeKey(status.hasKey);
        if (status.model && CLAUDE_MODELS.includes(status.model as ClaudeModel)) {
          setSelectedModel(status.model as ClaudeModel);
        }
      } catch (err) {
        console.error('Error checking Claude key status:', err);
        setHasClaudeKey(false);
      } finally {
        setIsCheckingKey(false);
      }
    };

    checkKeyStatus();
  }, [user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate stats context
  const statsExport = generateStatsExport(playerData, guildData, allSeasonsRaidData, tacticusUserId);
  const statsContext = statsExport ? statsExportToString(statsExport) : null;

  const handleModelChange = async (model: ClaudeModel) => {
    setSelectedModel(model);
    if (user) {
      try {
        await updateClaudeModel(user.uid, model);
      } catch (err) {
        console.error('Error updating model:', err);
      }
    }
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || isStreaming) return;

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessageData = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(true);

    try {
      const idToken = await user.getIdToken();
      abortControllerRef.current = new AbortController();

      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          statsContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullContent += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false }
            : m
        )
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User stopped the stream
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, isStreaming: false, content: m.content + '\n\n[Transmission aborted]' }
              : m
          )
        );
      } else {
        console.error('Chat error:', err);
        setError((err as Error).message || 'Failed to send message');
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [user, isStreaming, messages, statsContext]);

  const handleStopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Loading state
  if (isCheckingKey) {
    return (
      <Card className="bg-[rgba(var(--background-start-rgb),0.7)] border-[rgb(var(--border-color))]">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary-color))]" />
        </div>
      </Card>
    );
  }

  // No Claude key configured
  if (!hasClaudeKey) {
    return (
      <Card className="bg-[rgba(var(--background-start-rgb),0.7)] border-[rgb(var(--border-color))]">
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Bot className="w-16 h-16 text-gray-500 mb-4" />
          <Title className="text-[rgb(var(--primary-color))] mb-2">Cogitator Offline</Title>
          <Text className="text-center text-gray-400 mb-6 max-w-md">
            ++ Maschinengeist nicht initialisiert. Claude API Key erforderlich. ++
          </Text>
          <Link href="/settings">
            <Button icon={Settings} className="bg-[rgb(var(--primary-color))] border-[rgb(var(--primary-color))]">
              Interface Calibration
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[rgba(var(--background-start-rgb),0.7)] border-[rgb(var(--border-color))] flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgb(var(--border-color))] p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[rgba(160,50,50,0.2)] flex items-center justify-center">
            <Bot className="w-6 h-6 text-thematic-red" />
          </div>
          <div>
            <Title className="text-[rgb(var(--primary-color))] text-lg">Cogitator</Title>
            <Text className="text-xs text-gray-500">Taktischer Beratungs-Maschinengeist</Text>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector
            value={selectedModel}
            onChange={handleModelChange}
            disabled={isStreaming}
          />
          {messages.length > 0 && (
            <Button
              size="xs"
              variant="secondary"
              icon={Trash2}
              onClick={handleClearChat}
              disabled={isStreaming}
              className="text-gray-400 hover:text-thematic-red"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Stats context indicator */}
      {statsContext && (
        <div className="px-4 py-2 bg-[rgba(var(--primary-color),0.05)] border-b border-[rgb(var(--border-color))] flex items-center gap-2">
          <Info className="w-4 h-4 text-[rgb(var(--primary-color))]" />
          <Text className="text-xs text-[rgb(var(--primary-color))]">
            Cogitator hat Zugriff auf deine aktuellen Spielerdaten
          </Text>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-gray-500 mb-4" />
            <Text className="text-gray-400 mb-2">
              ++ Cogitator bereit. Awaiting transmission. ++
            </Text>
            <Text className="text-xs text-gray-500 max-w-md">
              Stelle Fragen zu deinem Roster, Raid-Teams, Upgrade-Prioritäten oder Strategien.
            </Text>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-3 rounded-lg bg-red-900/30 border border-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <Text className="text-sm text-red-300">{error}</Text>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[rgb(var(--border-color))] p-4">
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          disabled={isLoading && !isStreaming}
          isStreaming={isStreaming}
        />
      </div>
    </Card>
  );
}
