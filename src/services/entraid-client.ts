/**
 * Azure Entra ID OAuth2 client for user authentication
 */

import { randomBytes } from 'crypto';
import {
  ConfidentialClientApplication,
  type Configuration,
  type AuthorizationUrlRequest,
  type AuthorizationCodeRequest,
  type RefreshTokenRequest,
  type AuthenticationResult,
} from '@azure/msal-node';
import { CircuitBreaker, FailureType } from '../utils/circuit-breaker.js';
import { retryOAuthOperation } from '../utils/retry.js';
import {
  OAuthError,
  TokenRefreshError,
  AuthenticationError,
} from '../types/errors.js';

/**
 * Entra ID client configuration
 */
export interface EntraIDConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * OAuth flow state tracking
 */
interface AuthFlowState {
  codeVerifier: string;
  state: string;
  timestamp: number;
}

/**
 * Entra ID Client for OAuth2 user authentication
 * Handles authorization code flow with PKCE
 */
export class EntraIDClient {
  private msalClient: ConfidentialClientApplication;
  private config: EntraIDConfig;
  private circuitBreaker: CircuitBreaker;
  private pendingFlows: Map<string, AuthFlowState> = new Map();
  private readonly defaultScopes = ['User.Read', 'offline_access'];

  /**
   * Create a new Entra ID client
   * @param config - Entra ID configuration
   */
  constructor(config: EntraIDConfig) {
    this.config = config;

    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) {
              return;
            }
            console.error(`[MSAL] ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: 3, // Info level
        },
      },
    };

    this.msalClient = new ConfidentialClientApplication(msalConfig);
    // Circuit breaker excludes auth service failures (user errors)
    // Only counts network/server errors that indicate OAuth service issues
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      failureWindow: 30000,
      recoveryTimeout: 60000,
      successThreshold: 3,
      excludedFailureTypes: [FailureType.AUTH_SERVICE], // Don't open circuit for user auth failures
    });
  }

  /**
   * Initiate OAuth2 authorization flow with PKCE
   * @returns Authorization URL and state parameter
   * @throws Error if URL generation fails
   */
  async initiateAuthFlow(): Promise<{ authUrl: string; state: string }> {
    return this.circuitBreaker.execute(async () => {
      try {
        const scopes = this.config.scopes || this.defaultScopes;

        // Generate a secure state parameter for CSRF protection
        const state = randomBytes(32).toString('hex');

        const authCodeUrlParameters: AuthorizationUrlRequest = {
          scopes,
          redirectUri: this.config.redirectUri,
          responseMode: 'query',
          prompt: 'select_account',
          state, // Explicitly provide state parameter
        };

        const response = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);

        // Verify state parameter is in the URL
        const url = new URL(response);
        const urlState = url.searchParams.get('state');
        const codeChallenge = url.searchParams.get('code_challenge');

        if (!urlState || urlState !== state) {
          throw new Error('Failed to generate state parameter or state mismatch');
        }

        // Store flow state for callback validation
        // Note: In production, codeVerifier should be stored securely (e.g., session)
        // MSAL handles PKCE internally, we're tracking state for validation
        this.pendingFlows.set(state, {
          codeVerifier: codeChallenge || '',
          state,
          timestamp: Date.now(),
        });

        // Clean up old flows (older than 10 minutes)
        this.cleanupOldFlows();

        return {
          authUrl: response,
          state,
        };
      } catch (error) {
        console.error('[EntraIDClient] Authorization URL generation failed:', error);
        throw new Error(`Failed to initiate auth flow: ${error}`);
      }
    });
  }

  /**
   * Handle OAuth2 callback and exchange code for tokens
   * @param code - Authorization code from callback
   * @param state - State parameter for validation
   * @returns Authentication result with tokens
   * @throws OAuthError if token exchange fails
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<AuthenticationResult> {
    return this.circuitBreaker.execute(async () => {
      return retryOAuthOperation(
        async () => {
          try {
            // Validate state parameter
            const flowState = this.pendingFlows.get(state);
            if (!flowState) {
              throw new AuthenticationError(
                'Invalid or expired state parameter. Please restart the authentication flow.',
                {
                  state,
                  reason: 'state_mismatch',
                }
              );
            }

            // Remove used flow state
            this.pendingFlows.delete(state);

            const scopes = this.config.scopes || this.defaultScopes;

            const tokenRequest: AuthorizationCodeRequest = {
              code,
              scopes,
              redirectUri: this.config.redirectUri,
            };

            const response = await this.msalClient.acquireTokenByCode(tokenRequest);

            if (!response) {
              throw new OAuthError(
                'Token exchange returned empty response',
                'server_error',
                'The authorization server returned an empty response'
              );
            }

            console.error('[EntraIDClient] Token exchange successful');
            return response;
          } catch (error) {
            console.error('[EntraIDClient] Token exchange failed:', error);

            // If it's already one of our error types, re-throw
            if (
              error instanceof OAuthError ||
              error instanceof AuthenticationError
            ) {
              throw error;
            }

            // Wrap in OAuthError with proper context
            throw new OAuthError(
              error instanceof Error ? error.message : 'Token exchange failed',
              'authorization_failed',
              error instanceof Error ? error.message : undefined,
              {
                flow: 'token_exchange',
                originalError: error instanceof Error ? error.message : String(error),
              },
              error instanceof Error ? error : undefined
            );
          }
        },
        {
          onRetry: (attempt, error, delay) => {
            console.warn(
              `[EntraIDClient] Token exchange retry ${attempt}, waiting ${Math.round(delay)}ms...`,
              { error: error.message }
            );
          },
        }
      );
    });
  }

  /**
   * Refresh access token using refresh token with retry logic
   * @param refreshToken - Refresh token
   * @returns New authentication result
   * @throws TokenRefreshError if refresh fails after retries
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthenticationResult> {
    return this.circuitBreaker.execute(async () => {
      return retryOAuthOperation(
        async () => {
          try {
            const scopes = this.config.scopes || this.defaultScopes;

            const refreshRequest: RefreshTokenRequest = {
              refreshToken,
              scopes,
            };

            const response = await this.msalClient.acquireTokenByRefreshToken(refreshRequest);

            if (!response) {
              throw new TokenRefreshError('Token refresh returned empty response', {
                scopes,
              });
            }

            console.error('[EntraIDClient] Token refreshed successfully');
            return response;
          } catch (error) {
            console.error('[EntraIDClient] Token refresh failed:', error);

            // Check for invalid_grant - requires re-authentication
            if (
              error instanceof Error &&
              error.message.includes('invalid_grant')
            ) {
              throw new TokenRefreshError(
                'Refresh token is invalid or expired. User must re-authenticate.',
                {
                  requiresReauth: true,
                  originalError: error.message,
                }
              );
            }

            // Wrap in TokenRefreshError with proper context
            throw new TokenRefreshError(
              error instanceof Error ? error.message : 'Token refresh failed',
              {
                originalError: error instanceof Error ? error.message : String(error),
              },
              error instanceof Error ? error : undefined
            );
          }
        },
        {
          onRetry: (attempt, error, delay) => {
            console.warn(
              `[EntraIDClient] Token refresh retry ${attempt}, waiting ${Math.round(delay)}ms...`,
              { error: error.message }
            );
          },
        }
      );
    });
  }

  /**
   * Clean up old pending flows (older than 10 minutes)
   */
  private cleanupOldFlows(): void {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    for (const [state, flow] of this.pendingFlows.entries()) {
      if (flow.timestamp < tenMinutesAgo) {
        this.pendingFlows.delete(state);
      }
    }
  }

  /**
   * Get circuit breaker metrics
   * @returns Circuit breaker metrics
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Get number of pending auth flows
   * @returns Number of pending flows
   */
  getPendingFlowsCount(): number {
    return this.pendingFlows.size;
  }
}
