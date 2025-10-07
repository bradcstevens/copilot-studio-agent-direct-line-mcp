# Copilot Studio Agent Direct Line MCP Server

MCP (Model Context Protocol) server for Microsoft Copilot Studio Agent via Direct Line 3.0 API.

## Features

- ✅ **Direct Line 3.0 Integration** - Full support for Microsoft Bot Framework Direct Line API
- ✅ **Token Management** - Automatic token caching and proactive refresh
- ✅ **Conversation State** - Manages conversation lifecycle with 30-minute idle timeout
- ✅ **MCP Tools** - Four tools for agent interaction: send_message, start_conversation, end_conversation, get_conversation_history
- ✅ **Error Handling** - Retry logic with exponential backoff, circuit breaker pattern
- ✅ **Input Validation** - Zod schemas for type-safe validation
- ✅ **Security** - Secret masking in logs, secure environment configuration

## Requirements

- Node.js 18+
- Microsoft Copilot Studio Agent with Direct Line 3.0 enabled
- Direct Line secret key

## Installation

```bash
npm install
```

## Configuration

Create `.env` file based on `.env.example`:

```bash
# Required
DIRECT_LINE_SECRET=your_direct_line_secret_here

# Optional
LOG_LEVEL=info
TOKEN_REFRESH_INTERVAL=1800000  # 30 minutes in ms
```

## Development

```bash
# Build
npm run build

# Development mode with watch
npm run dev

# Lint
npm run lint

# Format
npm run format
```

## Usage

### VS Code Setup

#### 1. Configure MCP Settings

Add this server to your VS Code MCP configuration file:

```json
{
  "mcpServers": {
    "copilot-studio": {
      "command": "node",
      "args": ["/absolute/path/to/copilot-studio-agent-direct-line-mcp/dist/index.js"],
      "env": {
        "DIRECT_LINE_SECRET": "your_direct_line_secret_here"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/` with the actual path to this project directory.

#### 2. Build the Project

```bash
npm run build
```

#### 3. Verify Connection

In VS Code, you should see the MCP server icon in the toolbar of your GitHub Copilot tools. Click it to verify the server is connected and see the available tools:
- `send_message`
- `start_conversation`
- `end_conversation`
- `get_conversation_history`

#### 5. Using the Tools

You can now interact with your Copilot Studio Agent directly from GitHub Copilot:

```
Start a conversation with my bot and ask about product sizing
```

GitHub Copilot will use the `start_conversation` and `send_message` tools to communicate with your Copilot Studio Agent.

### Standalone Server Usage

You can also run the server standalone for testing or integration with other MCP clients:

```bash
# After building
node dist/index.js
```

The server uses stdio transport and will wait for MCP client connections.

### MCP Tools

#### `send_message`
Send a message to the Copilot Studio Agent.

**Parameters:**
- `message` (string, required): The message text
- `conversationId` (string, optional): Conversation ID to continue existing conversation

**Returns:** JSON with conversationId, response, and activityId

#### `start_conversation`
Start a new conversation with the Agent.

**Parameters:**
- `initialMessage` (string, optional): First message to send

**Returns:** JSON with conversationId, status, and optional response

#### `end_conversation`
End a conversation and clean up resources.

**Parameters:**
- `conversationId` (string, required): Conversation ID to terminate

**Returns:** JSON with conversationId, status, and messageCount

#### `get_conversation_history`
Retrieve message history for a conversation.

**Parameters:**
- `conversationId` (string, required): Conversation ID
- `limit` (number, optional): Maximum number of messages to return

**Returns:** JSON with conversationId, messageCount, totalMessages, and messages array

## Architecture

```
src/
├── config/          # Environment configuration with Zod validation
├── server/          # MCP server implementation
│   ├── mcp-server.ts       # Main MCP server class
│   ├── tool-schemas.ts     # Zod validation schemas
│   └── mcp-response.ts     # Response formatting & error handling
├── services/        # Core business logic
│   ├── directline-client.ts      # Direct Line API client with circuit breaker
│   ├── token-manager.ts          # Token caching & refresh
│   ├── conversation-manager.ts   # Conversation lifecycle management
│   └── http-client.ts            # Axios HTTP client
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
    ├── retry.ts              # Retry logic with exponential backoff
    ├── circuit-breaker.ts    # Circuit breaker pattern
    └── secret-masking.ts     # Security utilities
```

## Key Components

### DirectLineClient
Handles all Direct Line API interactions with circuit breaker protection:
- Token generation
- Conversation creation
- Message sending
- Activity retrieval

### TokenManager
Manages Direct Line tokens with:
- In-memory caching (no disk persistence for security)
- Automatic refresh 5 minutes before expiry
- Metrics tracking

### ConversationManager
Tracks conversation state with:
- 30-minute idle timeout
- Watermark-based message tracking
- Message history buffering
- Automatic cleanup

### CircuitBreaker
Prevents cascading failures with:
- 3 states: CLOSED, OPEN, HALF_OPEN
- Configurable failure threshold (5 failures in 30s)
- Recovery timeout (60s)
- Success threshold for recovery (3 consecutive successes)

## Error Handling

The server implements comprehensive error handling:

1. **Retry Logic**: Exponential backoff (1s, 2s, 4s delays, max 3 retries)
2. **Circuit Breaker**: Automatic fail-fast when service is degraded
3. **Error Classification**: Categorizes errors (network, auth, rate limit, etc.)
4. **MCP Error Transformation**: Converts internal errors to MCP-compliant responses

## Security

- **No Secret Logging**: Direct Line secret and tokens are never logged
- **Secret Masking**: Shows only first 4 and last 4 characters in logs
- **Environment Validation**: Zod schema validation for configuration
- **In-Memory Only**: No disk persistence of sensitive data

## Troubleshooting

### MCP Server Not Connecting in VS Code

1. **Check the configuration path** - Ensure the absolute path to `dist/index.js` is correct
2. **Verify the build** - Run `npm run build` to ensure TypeScript compiled successfully
3. **Check logs** - Look at VS Code logs for error messages
4. **Test standalone** - Run `node dist/index.js` to verify the server starts without errors
5. **Restart VS Code** - After making config changes, fully quit and restart

### Direct Line Connection Issues

1. **Verify Secret** - Check that `DIRECT_LINE_SECRET` is correct in your configuration
2. **Check Bot Status** - Ensure your Copilot Studio Agent is published and Direct Line channel is enabled
3. **Review Logs** - Server logs will show connection attempts and errors

### Common Errors

**"Failed to generate Direct Line token"**
- Verify your `DIRECT_LINE_SECRET` is correct
- Check that the Direct Line channel is enabled in Azure Bot Service

**"Conversation not found or expired"**
- Conversations expire after 30 minutes of inactivity
- Start a new conversation with `start_conversation` tool

**"Circuit breaker is OPEN"**
- The server detected multiple failures and is protecting against cascading failures
- Wait 60 seconds for the circuit breaker to attempt recovery
- Check Direct Line API connectivity

## Example VS Code mcp.json Configuration

Here's a complete example configuration for macOS:

```json
{
  "servers": {
    "copilot-studio": {
      "command": "node",
      "args": [
        "/Users/yourname/code/copilot-studio-agent-direct-line-mcp/dist/index.js"
      ],
      "env": {
        "DIRECT_LINE_SECRET": "your_secret_here",
        "LOG_LEVEL": "info",
        "TOKEN_REFRESH_INTERVAL": "1800000"
      }
    }
  }
}
```

**Windows example:**

```json
{
  "servers": {
    "copilot-studio": {
      "command": "node",
      "args": [
        "C:\\Users\\yourname\\code\\copilot-studio-agent-direct-line-mcp\\dist\\index.js"
      ],
      "env": {
        "DIRECT_LINE_SECRET": "your_secret_here"
      }
    }
  }
}
```

## Testing

Run the included test client to verify functionality:

```bash
npx tsx test-mcp-client.ts
```

This will test all 4 MCP tools and verify integration with your Copilot Studio Agent.

See `TEST_RESULTS.md` for detailed test results.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
