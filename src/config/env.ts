/**
 * Environment configuration loader and validator
 */

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { envSchema, type EnvConfig } from './env.schema.js';

/**
 * Environment validation error
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Load and validate environment variables
 * @returns Validated environment configuration
 * @throws {EnvValidationError} If validation fails
 */
export function loadEnvironment(): EnvConfig {
  // Load .env file in development (if it exists)
  loadDotenv();

  try {
    // Parse and validate environment variables
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      // Collect all validation errors
      const errorMessages = result.error.errors.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      });

      throw new EnvValidationError(
        `Environment validation failed:\n${errorMessages.join('\n')}`,
        result.error
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw error;
    }
    throw new Error(`Failed to load environment: ${error}`);
  }
}

/**
 * Cached environment configuration
 */
let cachedEnv: EnvConfig | null = null;

/**
 * Get validated environment configuration (cached)
 * @returns Validated environment configuration
 */
export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = loadEnvironment();
  }
  return cachedEnv;
}

/**
 * Reset environment cache (useful for testing)
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}
