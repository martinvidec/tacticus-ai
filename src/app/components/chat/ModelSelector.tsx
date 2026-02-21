'use client';

import React from 'react';
import { Select, SelectItem } from '@tremor/react';
import { CLAUDE_MODELS, ClaudeModel } from '@/lib/validation';

interface ModelSelectorProps {
  value: ClaudeModel;
  onChange: (model: ClaudeModel) => void;
  disabled?: boolean;
}

const MODEL_DISPLAY_NAMES: Record<ClaudeModel, string> = {
  'claude-sonnet-4-20250514': 'Claude 4 Sonnet (Latest)',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku (Fast)',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
};

export default function ModelSelector({ value, onChange, disabled = false }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">Model:</span>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as ClaudeModel)}
        disabled={disabled}
        className="min-w-[180px]"
      >
        {CLAUDE_MODELS.map((model) => (
          <SelectItem key={model} value={model}>
            {MODEL_DISPLAY_NAMES[model]}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
