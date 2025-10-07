/**
 * Zod validation schemas for MCP tool inputs
 */

import { z } from 'zod';

/**
 * Schema for send_message tool arguments
 */
export const SendMessageArgsSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
});

export type SendMessageArgs = z.infer<typeof SendMessageArgsSchema>;

/**
 * Schema for start_conversation tool arguments
 */
export const StartConversationArgsSchema = z.object({
  initialMessage: z.string().min(1, 'Initial message cannot be empty').optional(),
});

export type StartConversationArgs = z.infer<typeof StartConversationArgsSchema>;

/**
 * Schema for end_conversation tool arguments
 */
export const EndConversationArgsSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
});

export type EndConversationArgs = z.infer<typeof EndConversationArgsSchema>;

/**
 * Schema for get_conversation_history tool arguments
 */
export const GetConversationHistoryArgsSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  limit: z.number().int().positive().optional(),
});

export type GetConversationHistoryArgs = z.infer<typeof GetConversationHistoryArgsSchema>;

/**
 * Validate and parse tool arguments
 * @param schema - Zod schema to validate against
 * @param args - Arguments to validate
 * @returns Parsed and validated arguments
 * @throws Error if validation fails
 */
export function validateToolArgs<T>(schema: z.ZodSchema<T>, args: unknown): T {
  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }
    throw error;
  }
}
