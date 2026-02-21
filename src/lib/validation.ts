import { z } from 'zod';

/**
 * Validation schemas for API endpoints
 */

// Season parameter validation (numeric string, e.g., "69", "93")
export const SeasonParamSchema = z.object({
  season: z
    .string()
    .min(1, 'Season parameter is required')
    .max(10, 'Season parameter too long')
    .regex(/^\d+$/, 'Invalid season format. Expected numeric value.'),
});

// API Key validation for validateKeyAndGetId endpoint
export const ApiKeyBodySchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API key is required')
    .max(100, 'API key too long'),
});

// Authorization header validation
export const AuthHeaderSchema = z
  .string()
  .min(1, 'Authorization header is required')
  .startsWith('Bearer ', 'Authorization header must start with "Bearer "');

// Generic validation helper
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((e) => e.message)
      .join(', ');
    return { success: false, error: errorMessage };
  }
  return { success: true, data: result.data };
}

// ============================================
// Claude Chat Validation Schemas
// ============================================

// Available Claude models
export const CLAUDE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
] as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[number];

// Claude API Key validation
export const ClaudeApiKeySchema = z.object({
  apiKey: z
    .string()
    .min(1, 'Claude API key is required')
    .max(200, 'Claude API key too long')
    .regex(/^sk-ant-/, 'Invalid Claude API key format'),
});

// Claude model selection validation
export const ClaudeModelSchema = z.object({
  model: z.enum(CLAUDE_MODELS),
});

// Chat message validation
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
});

// Chat request validation (for API route)
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required').max(50, 'Too many messages'),
});
