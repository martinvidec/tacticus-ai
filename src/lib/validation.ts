import { z } from 'zod';

/**
 * Validation schemas for API endpoints
 */

// Season parameter validation (e.g., "GR_S17", "GR_S18")
export const SeasonParamSchema = z.object({
  season: z
    .string()
    .min(1, 'Season parameter is required')
    .max(20, 'Season parameter too long')
    .regex(/^GR_S\d+$/, 'Invalid season format. Expected format: GR_S<number>'),
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
