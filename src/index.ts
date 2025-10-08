#!/usr/bin/env node

/**
 * MCP Server for Microsoft Copilot Studio Agent via Direct Line 3.0
 * Main entry point with support for stdio and HTTP transport modes
 */

import { getEnv } from './config/env.js';
import { DirectLineClient } from './services/directline-client.js';
import { TokenManager } from './services/token-manager.js';
import { ConversationManager } from './services/conversation-manager.js';
import { EnhancedMCPServer, type TransportMode } from './server/mcp-server-enhanced.js';
import { EntraIDClient } from './services/entraid-client.js';
import { SessionManager } from './services/session-manager.js';
import { MemorySessionStore } from './services/stores/memory-session-store.js';
import { FileSessionStore } from './services/stores/file-session-store.js';
import { MCPHttpServer } from './services/http-server.js';
import type { ISessionStore } from './types/session.js';

let server: EnhancedMCPServer | null = null;
let httpServer: MCPHttpServer | null = null;

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    console.log('Starting Copilot Studio Agent Direct Line MCP Server...');

    // Load and validate environment configuration
    const env = getEnv();
    console.log(`[Config] Environment loaded successfully`);
    console.log(`[Config] Log level: ${env.LOG_LEVEL}`);
    console.log(`[Config] Token refresh interval: ${env.TOKEN_REFRESH_INTERVAL}ms`);

    // Determine transport mode from environment
    const transportMode: TransportMode = (process.env.MCP_TRANSPORT_MODE as TransportMode) || 'stdio';
    console.log(`[Config] Transport mode: ${transportMode}`);

    // Initialize Direct Line client
    const client = new DirectLineClient(env.DIRECT_LINE_SECRET);
    console.log('[DirectLine] Client initialized');

    // Initialize Token Manager
    const tokenManager = new TokenManager(client, env.TOKEN_REFRESH_INTERVAL);
    console.log('[TokenManager] Token manager initialized');

    // Initialize Conversation Manager
    const conversationManager = new ConversationManager(client, tokenManager);
    console.log('[ConversationManager] Conversation manager initialized');

    // Initialize authentication components if using HTTP transport or authentication is enabled
    let entraidClient: EntraIDClient | undefined;
    let sessionManager: SessionManager | undefined;

    if (transportMode === 'http' || process.env.ENABLE_AUTH === 'true') {
      // Validate required environment variables for authentication
      if (!process.env.ENTRA_TENANT_ID || !process.env.ENTRA_CLIENT_ID || !process.env.ENTRA_CLIENT_SECRET) {
        throw new Error(
          'Authentication enabled but missing required environment variables: ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET'
        );
      }

      // Initialize Entra ID client
      entraidClient = new EntraIDClient({
        tenantId: process.env.ENTRA_TENANT_ID,
        clientId: process.env.ENTRA_CLIENT_ID,
        clientSecret: process.env.ENTRA_CLIENT_SECRET,
        redirectUri: process.env.ENTRA_REDIRECT_URI || 'http://localhost:3001/auth/callback',
        scopes: process.env.ENTRA_SCOPES?.split(',') || ['openid', 'profile', 'email'],
      });
      console.log('[EntraID] OAuth client initialized');

      // Initialize session store based on configuration
      let sessionStore: ISessionStore;
      const sessionStoreType = process.env.SESSION_STORE_TYPE || 'memory';

      switch (sessionStoreType) {
        case 'file':
          sessionStore = new FileSessionStore({
            storageDir: process.env.SESSION_STORAGE_DIR || '.sessions',
            encryptionKey: process.env.SESSION_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'default-key',
          });
          console.log('[SessionStore] File-based session store initialized');
          break;

        case 'memory':
        default:
          sessionStore = new MemorySessionStore();
          console.log('[SessionStore] In-memory session store initialized');
          break;
      }

      // Initialize session manager
      sessionManager = new SessionManager(sessionStore, {
        sessionTimeout: process.env.SESSION_TIMEOUT
          ? parseInt(process.env.SESSION_TIMEOUT, 10)
          : 24 * 60 * 60 * 1000, // 24 hours
        allowMultipleSessions: process.env.ALLOW_MULTIPLE_SESSIONS !== 'false',
        maxSessionsPerUser: process.env.MAX_SESSIONS_PER_USER
          ? parseInt(process.env.MAX_SESSIONS_PER_USER, 10)
          : 5,
      });
      console.log('[SessionManager] Session manager initialized');

      // Initialize HTTP server if using HTTP transport
      if (transportMode === 'http') {
        httpServer = new MCPHttpServer(
          {
            port: process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 3000,
            sessionSecret: process.env.SESSION_SECRET || 'mcp-session-secret',
            allowedOrigins: process.env.ALLOWED_ORIGINS?.split(','),
            trustProxy: process.env.TRUST_PROXY === 'true',
          },
          entraidClient,
          sessionManager
        );
        console.log('[HTTP] HTTP server initialized');
      }
    }

    // Initialize Enhanced MCP Server
    server = new EnhancedMCPServer(client, tokenManager, conversationManager, {
      transportMode,
      entraidClient,
      sessionManager,
    });

    // Set up graceful shutdown
    setupShutdownHandlers();

    // Start the server
    await server.start();

    // Start HTTP server if configured
    if (httpServer) {
      httpServer.start();
    }

    console.log('✅ Server ready and listening for MCP requests');
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

/**
 * Set up graceful shutdown handlers
 */
function setupShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);

    if (server) {
      await server.stop();
    }

    console.log('[Shutdown] Server stopped successfully');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  main().catch((error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });
}

export { main };
