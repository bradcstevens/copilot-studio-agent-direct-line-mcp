/**
 * Comprehensive input validation and security utilities using Zod
 * Protects against SQL injection, XSS, path traversal, and other attacks
 */

import { z } from 'zod';

/**
 * SQL injection patterns to detect and block
 */
const SQL_INJECTION_PATTERNS = [
  /(\bor\b|\band\b).*?=.*?=/i, // OR/AND injection
  /union.*?select/i, // UNION SELECT
  /select.*?from/i, // SELECT FROM
  /insert.*?into/i, // INSERT INTO
  /update.*?set/i, // UPDATE SET
  /delete.*?from/i, // DELETE FROM
  /drop.*?(table|database)/i, // DROP TABLE/DATABASE
  /;.*?(select|insert|update|delete|drop|create|alter)/i, // Multiple statements
  /--/i, // SQL comments
  /\/\*/i, // SQL block comments
  /exec(\s|\()/i, // EXEC commands
  /xp_/i, // Extended stored procedures
];

/**
 * XSS patterns to detect and block
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/i, // Script tags
  /javascript:/i, // JavaScript protocol
  /on\w+\s*=/i, // Event handlers (onclick, onerror, etc.)
  /<iframe/i, // Iframe tags
  /<embed/i, // Embed tags
  /<object/i, // Object tags
  /eval\(/i, // Eval function
  /expression\(/i, // CSS expression
  /<link/i, // Link tags
  /<meta/i, // Meta tags
];

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,  // ../ traversal
  /\.\.\\/,  // ..\ traversal
  /%2e%2e%2f/i, // URL-encoded ../
  /%2e%2e%5c/i, // URL-encoded ..\
  /\.\./,    // .. anywhere
];

/**
 * Check if string contains SQL injection attempts
 */
export function containsSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Check if string contains XSS attempts
 */
export function containsXSS(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Check if string contains path traversal attempts
 */
export function containsPathTraversal(input: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitize string from potential SQL injection
 */
export function sanitizeSQL(input: string): string {
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment starts
    .replace(/\*\//g, ''); // Remove block comment ends
}

/**
 * Sanitize string from potential XSS
 */
export function sanitizeXSS(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize file path to prevent traversal
 */
export function sanitizePath(input: string): string {
  return input
    .replace(/\.\./g, '') // Remove ..
    .replace(/[\/\\]{2,}/g, '/') // Normalize multiple slashes
    .replace(/^[\/\\]+/, ''); // Remove leading slashes
}

/**
 * Zod refinement for SQL injection protection
 */
export const noSQLInjection = z.string().refine(
  (val) => !containsSQLInjection(val),
  { message: 'Input contains potential SQL injection attempt' }
);

/**
 * Zod refinement for XSS protection
 */
export const noXSS = z.string().refine(
  (val) => !containsXSS(val),
  { message: 'Input contains potential XSS attempt' }
);

/**
 * Zod refinement for path traversal protection
 */
export const noPathTraversal = z.string().refine(
  (val) => !containsPathTraversal(val),
  { message: 'Input contains potential path traversal attempt' }
);

/**
 * Secure string schema with all protections
 */
export const secureString = z.string()
  .min(1, 'String cannot be empty')
  .max(10000, 'String too long')
  .refine((val) => !containsSQLInjection(val), 'SQL injection detected')
  .refine((val) => !containsXSS(val), 'XSS attempt detected')
  .refine((val) => !containsPathTraversal(val), 'Path traversal detected');

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .refine((val) => !containsXSS(val), 'Invalid characters in email');

/**
 * URL validation schema
 */
export const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .refine((val) => {
    try {
      const url = new URL(val);
      // Only allow http, https protocols
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }, 'Only HTTP/HTTPS URLs allowed');

/**
 * UUID validation schema
 */
export const uuidSchema = z.string()
  .uuid('Invalid UUID format');

/**
 * ISO date validation schema
 */
export const isoDateSchema = z.string()
  .datetime('Invalid ISO date format');

/**
 * File path validation schema
 */
export const filePathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .max(4096, 'Path too long')
  .refine((val) => !containsPathTraversal(val), 'Path traversal detected')
  .refine((val) => {
    // Ensure path doesn't start with / or contain Windows drive letters
    return !val.startsWith('/') && !val.match(/^[a-zA-Z]:/);
  }, 'Absolute paths not allowed');

/**
 * IP address validation schema (IPv4 and IPv6)
 */
export const ipAddressSchema = z.string()
  .refine((val) => {
    // IPv4 regex
    const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // IPv6 regex (simplified)
    const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::)$/;
    return ipv4.test(val) || ipv6.test(val);
  }, 'Invalid IP address format');

/**
 * Port number validation schema
 */
export const portSchema = z.number()
  .int('Port must be an integer')
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must be at most 65535');

/**
 * Conversation ID validation schema
 */
export const conversationIdSchema = z.string()
  .min(1, 'Conversation ID cannot be empty')
  .max(256, 'Conversation ID too long')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Conversation ID contains invalid characters');

/**
 * Session ID validation schema
 */
export const sessionIdSchema = z.string()
  .min(16, 'Session ID too short')
  .max(256, 'Session ID too long')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Session ID contains invalid characters');

/**
 * User ID validation schema
 */
export const userIdSchema = z.string()
  .min(1, 'User ID cannot be empty')
  .max(256, 'User ID too long')
  .regex(/^[a-zA-Z0-9\-_@.]+$/, 'User ID contains invalid characters');

/**
 * Message text validation schema
 */
export const messageTextSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(100000, 'Message too long (max 100KB)')
  .refine((val) => !containsSQLInjection(val), 'SQL injection detected in message');

/**
 * Password strength validation
 */
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password too long')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain special character');

/**
 * API key validation schema
 */
export const apiKeySchema = z.string()
  .min(16, 'API key too short')
  .max(512, 'API key too long')
  .regex(/^[a-zA-Z0-9\-_.]+$/, 'API key contains invalid characters');

/**
 * JWT token validation schema
 */
export const jwtTokenSchema = z.string()
  .regex(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, 'Invalid JWT format');

/**
 * Tenant ID validation schema (Azure Entra ID format)
 */
export const tenantIdSchema = z.string()
  .uuid('Invalid tenant ID format');

/**
 * Client ID validation schema (Azure Entra ID format)
 */
export const clientIdSchema = z.string()
  .uuid('Invalid client ID format');

/**
 * Validate and sanitize input
 * @param input - Input to validate
 * @param schema - Zod schema to validate against
 * @returns Validated and sanitized input
 * @throws Error if validation fails
 */
export function validateInput<T>(input: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validate and sanitize input with custom error message
 * @param input - Input to validate
 * @param schema - Zod schema to validate against
 * @param errorMessage - Custom error message
 * @returns Validated input or null if validation fails
 */
export function validateInputSafe<T>(
  input: unknown,
  schema: z.ZodSchema<T>,
  errorMessage?: string
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return {
      success: false,
      error: errorMessage || `Validation failed: ${errors}`,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Rate limit key validation (for rate limiting by user, IP, etc.)
 */
export const rateLimitKeySchema = z.string()
  .min(1, 'Rate limit key cannot be empty')
  .max(256, 'Rate limit key too long')
  .regex(/^[a-zA-Z0-9\-_.:]+$/, 'Rate limit key contains invalid characters');

/**
 * HTTP header value validation
 */
export const httpHeaderSchema = z.string()
  .max(8192, 'Header value too long')
  .refine((val) => !val.includes('\r') && !val.includes('\n'), 'Header contains CRLF');

/**
 * User agent validation
 */
export const userAgentSchema = z.string()
  .max(2048, 'User agent too long')
  .refine((val) => !containsXSS(val), 'Invalid characters in user agent');

/**
 * Correlation ID validation
 */
export const correlationIdSchema = z.string()
  .min(1, 'Correlation ID cannot be empty')
  .max(128, 'Correlation ID too long')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Correlation ID contains invalid characters');
