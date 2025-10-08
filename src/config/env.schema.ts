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
 * Node environment type
 */
export const NodeEnv = z.enum(['development', 'staging', 'production']).default('development');
export type NodeEnv = z.infer<typeof NodeEnv>;

/**
 * OAuth2 scope validation
 * Ensures scopes are space-separated valid Azure AD scopes
 */
const oauthScopesSchema = z
  .string()
  .regex(/^[a-zA-Z0-9\-_/.:\s]+$/, 'OAuth scopes contain invalid characters')
  .transform((val) => val.split(' ').filter(Boolean))
  .pipe(z.array(z.string()).min(1, 'At least one OAuth scope is required'));

/**
 * Environment variables schema
 */
export const envSchema = z.object({
  /**
   * Node environment (development, staging, production)
   */
  NODE_ENV: NodeEnv,

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

  // OAuth2 / Azure Entra ID Configuration
  /**
   * Azure Entra ID Client ID (Application ID)
   * Required in production, optional in development
   * Format: UUID (e.g., 12345678-1234-1234-1234-123456789abc)
   */
  AZURE_CLIENT_ID: z
    .string()
    .uuid('AZURE_CLIENT_ID must be a valid UUID')
    .optional()
    .refine(
      (val) => {
        const env = process.env.NODE_ENV;
        if (env === 'production' && !val) {
          return false;
        }
        return true;
      },
      { message: 'AZURE_CLIENT_ID is required in production' }
    ),

  /**
   * Azure Entra ID Client Secret
   * Required in production, optional in development
   * Minimum 16 characters for security
   */
  AZURE_CLIENT_SECRET: z
    .string()
    .min(16, 'AZURE_CLIENT_SECRET must be at least 16 characters')
    .optional()
    .refine(
      (val) => {
        const env = process.env.NODE_ENV;
        if (env === 'production' && !val) {
          return false;
        }
        return true;
      },
      { message: 'AZURE_CLIENT_SECRET is required in production' }
    ),

  /**
   * Azure Entra ID Tenant ID (Directory ID)
   * Required in production, optional in development
   * Format: UUID or domain (e.g., contoso.onmicrosoft.com)
   */
  AZURE_TENANT_ID: z
    .string()
    .min(1, 'AZURE_TENANT_ID cannot be empty')
    .optional()
    .refine(
      (val) => {
        const env = process.env.NODE_ENV;
        if (env === 'production' && !val) {
          return false;
        }
        // Validate UUID or domain format
        if (val) {
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const domainPattern = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
          return uuidPattern.test(val) || domainPattern.test(val);
        }
        return true;
      },
      { message: 'AZURE_TENANT_ID must be a valid UUID or domain' }
    ),

  /**
   * OAuth2 Redirect URI
   * Where users are redirected after authentication
   * Must be HTTPS in production (except localhost)
   */
  REDIRECT_URI: z
    .string()
    .url('REDIRECT_URI must be a valid URL')
    .optional()
    .refine(
      (val) => {
        const env = process.env.NODE_ENV;
        if (env === 'production' && val) {
          // Production must use HTTPS unless localhost
          const url = new URL(val);
          const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
          return url.protocol === 'https:' || isLocalhost;
        }
        return true;
      },
      { message: 'REDIRECT_URI must use HTTPS in production (except localhost)' }
    )
    .default('http://localhost:3000/auth/callback'),

  /**
   * OAuth2 Scopes
   * Space-separated list of requested permissions
   * Example: "openid profile email https://graph.microsoft.com/.default"
   */
  OAUTH_SCOPES: oauthScopesSchema.default('openid profile email'),
});

/**
 * Inferred type from environment schema
 */
export type EnvConfig = z.infer<typeof envSchema>;
