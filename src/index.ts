#!/usr/bin/env node

/**
 * MCP Server for Microsoft Copilot Studio Agent via Direct Line 3.0
 * Main entry point
 */

import { getEnv } from './config/env.js';
import { DirectLineClient } from './services/directline-client.js';
import { TokenManager } from './services/token-manager.js';
import { ConversationManager } from './services/conversation-manager.js';
import { CopilotStudioMCPServer } from './server/mcp-server.js';

let server: CopilotStudioMCPServer | null = null;

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

    // Initialize Direct Line client
    const client = new DirectLineClient(env.DIRECT_LINE_SECRET);
    console.log('[DirectLine] Client initialized');

    // Initialize Token Manager
    const tokenManager = new TokenManager(client, env.TOKEN_REFRESH_INTERVAL);
    console.log('[TokenManager] Token manager initialized');

    // Initialize Conversation Manager
    const conversationManager = new ConversationManager(client, tokenManager);
    console.log('[ConversationManager] Conversation manager initialized');

    // Initialize MCP Server
    server = new CopilotStudioMCPServer(client, tokenManager, conversationManager);

    // Set up graceful shutdown
    setupShutdownHandlers();

    // Start the server
    await server.start();

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
