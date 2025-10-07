/**
 * Environment variable schema and validation using Zod
 */

import { z } from 'zod';

/**
 * Log level enum
 */
export const LogLevel = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevel>;

/**
 * Environment variables schema
 */
export const envSchema = z.object({
  /**
   * Direct Line API secret key (required)
   * Used for token generation and authentication
   */
  DIRECT_LINE_SECRET: z
    .string()
    .min(1, 'DIRECT_LINE_SECRET is required')
    .regex(/^[A-Za-z0-9_.-]+$/, 'DIRECT_LINE_SECRET contains invalid characters'),

  /**
   * MCP server port (optional, auto-assigns if not provided)
   * Valid range: 1024-65535
   */
  MCP_SERVER_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int()
        .min(1024, 'Port must be >= 1024')
        .max(65535, 'Port must be <= 65535')
        .optional()
    ),

  /**
   * Logging level (optional, defaults to 'info')
   */
  LOG_LEVEL: LogLevel.default('info'),

  /**
   * Token refresh interval in milliseconds (optional, defaults to 30 minutes)
   * Minimum: 5 minutes (300000ms)
   * Default: 30 minutes (1800000ms)
   */
  TOKEN_REFRESH_INTERVAL: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1800000))
    .pipe(
      z
        .number()
        .int()
        .min(300000, 'Token refresh interval must be at least 5 minutes (300000ms)')
        .default(1800000)
    ),
});

/**
 * Inferred type from environment schema
 */
export type EnvConfig = z.infer<typeof envSchema>;
