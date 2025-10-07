/**
 * Utilities for secure secret handling and masking
 */

/**
 * Mask a secret value for logging
 * Shows first 4 and last 4 characters, masks the rest
 * @param secret - The secret to mask
 * @returns Masked secret string
 */
export function maskSecret(secret: string | undefined): string {
  if (!secret) {
    return '[NOT_SET]';
  }

  if (secret.length <= 8) {
    return '***';
  }

  const start = secret.substring(0, 4);
  const end = secret.substring(secret.length - 4);
  const middle = '*'.repeat(Math.min(secret.length - 8, 20));

  return `${start}${middle}${end}`;
}

/**
 * Sanitize an object for logging by masking sensitive fields
 * @param obj - Object to sanitize
 * @param sensitiveKeys - Array of key names to mask (default: common secret keys)
 * @returns Sanitized object safe for logging
 */
export function sanitizeForLogging(
  obj: Record<string, unknown>,
  sensitiveKeys: string[] = [
    'secret',
    'password',
    'token',
    'apiKey',
    'api_key',
    'authorization',
    'DIRECT_LINE_SECRET',
  ]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()));

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = maskSecret(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>, sensitiveKeys);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Redact secret from error messages
 * @param error - Error object or message
 * @param secret - Secret to redact
 * @returns Sanitized error message
 */
export function redactSecretFromError(error: Error | string, secret?: string): string {
  const message = typeof error === 'string' ? error : error.message;

  if (!secret) {
    return message;
  }

  // Replace any occurrence of the secret with a masked version
  return message.replace(new RegExp(secret, 'g'), maskSecret(secret));
}

/**
 * Custom JSON.stringify replacer that masks sensitive values
 * @param sensitiveKeys - Keys to mask during serialization
 * @returns Replacer function for JSON.stringify
 */
export function createSecretReplacer(
  sensitiveKeys: string[] = ['secret', 'password', 'token', 'apiKey', 'api_key', 'authorization']
): (key: string, value: unknown) => unknown {
  return (key: string, value: unknown) => {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()));

    if (isSensitive && typeof value === 'string') {
      return maskSecret(value);
    }

    return value;
  };
}
