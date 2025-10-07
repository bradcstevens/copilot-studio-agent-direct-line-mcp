/**
 * Axios HTTP client configuration for Direct Line API
 */

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { maskSecret } from '../utils/secret-masking.js';

/**
 * Direct Line API base URL
 */
export const DIRECT_LINE_BASE_URL = 'https://directline.botframework.com/v3/directline';

/**
 * HTTP client configuration options
 */
export interface HttpClientOptions {
  timeout?: number;
  baseURL?: string;
  enableLogging?: boolean;
}

/**
 * Create configured axios instance for Direct Line API
 * @param options - Configuration options
 * @returns Configured axios instance
 */
export function createHttpClient(options: HttpClientOptions = {}): AxiosInstance {
  const {
    timeout = 5000,
    baseURL = DIRECT_LINE_BASE_URL,
    enableLogging = true,
  } = options;

  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'copilot-studio-agent-direct-line-mcp/1.0.1',
    },
  });

  // Request interceptor for logging
  if (enableLogging) {
    client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const startTime = Date.now();
        (config as InternalAxiosRequestConfig & { metadata?: { startTime: number } }).metadata = {
          startTime,
        };

        // Log request (with token masking)
        const authHeader = config.headers?.['Authorization'] as string | undefined;
        const maskedAuth = authHeader
          ? `Bearer ${maskSecret(authHeader.replace('Bearer ', ''))}`
          : 'None';

        console.log(`[HTTP] → ${config.method?.toUpperCase()} ${config.url}`, {
          authorization: maskedAuth,
          contentType: config.headers?.['Content-Type'],
        });

        return config;
      },
      (error) => {
        console.error('[HTTP] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    client.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as InternalAxiosRequestConfig & {
          metadata?: { startTime: number };
        };
        const duration = config.metadata?.startTime ? Date.now() - config.metadata.startTime : 0;

        console.log(
          `[HTTP] ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
          {
            duration: `${duration}ms`,
            dataSize: JSON.stringify(response.data).length,
          }
        );

        return response;
      },
      (error) => {
        const config = error.config as InternalAxiosRequestConfig & {
          metadata?: { startTime: number };
        };
        const duration = config?.metadata?.startTime ? Date.now() - config.metadata.startTime : 0;

        if (error.response) {
          console.error(`[HTTP] ← ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            duration: `${duration}ms`,
            error: error.response.data,
          });
        } else if (error.request) {
          console.error(`[HTTP] ← No response ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            duration: `${duration}ms`,
            error: error.message,
          });
        } else {
          console.error('[HTTP] Request setup error:', error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  return client;
}
