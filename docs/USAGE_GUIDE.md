# 📖 Usage Guide

This guide provides comprehensive information on using the Copilot Studio Agent Direct Line MCP Server with VS Code and other clients.

## Using with VS Code

The MCP server integrates seamlessly with VS Code through GitHub Copilot's MCP support.

### Prerequisites

- **VS Code**: Version 1.96.0 or higher (December 2024 release or later)
- **GitHub Copilot Extension**: Required for MCP server integration
- **Node.js**: 18.x or higher installed on your system

### How It Works

1. **Automatic Invocation**: When you use GitHub Copilot, VS Code automatically starts the MCP server via `npx`
2. **Stdio Transport**: Communication happens through standard input/output (no network required)
3. **Tool Discovery**: GitHub Copilot automatically discovers available MCP tools
4. **Agent Mode**: Use Agent Mode to explicitly select which MCP tools to include in your conversation

### Using the MCP Server

**Method 1: Agent Mode (Recommended)**
1. Open GitHub Copilot Chat
2. Click "Select Tools" or use the Agent Mode picker
3. Choose the Copilot Studio MCP tools you want to use
4. Start chatting! Example: "Start a conversation with my Copilot Studio Agent"

**Method 2: Natural Language**
- GitHub Copilot automatically detects when to use MCP tools based on your prompts
- Example: "Ask my bot about pricing" → Copilot will use the MCP server automatically

Learn more about Agent Mode in the [VS Code Documentation](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode).

### HTTP Transport Mode with VS Code

While stdio transport is recommended for local development, you can also connect VS Code to a remote MCP server running in HTTP mode:

**Setup for Remote HTTP Server:**

1. **Deploy HTTP Server**: See [Setup and Deployment Guide](./SETUP_AND_DEPLOYMENT.md)
2. **Configure VS Code**: Add to `.vscode/mcp.json`:
   ```json
   {
     "servers": {
       "copilot-studio-remote": {
         "type": "http",
         "url": "https://your-mcp-server.azurecontainerapps.io/mcp",
         "auth": {
           "type": "oauth2",
           "authorizationUrl": "https://your-mcp-server.azurecontainerapps.io/authorize",
           "tokenUrl": "https://your-mcp-server.azurecontainerapps.io/auth/token"
         }
       }
     }
   }
   ```
3. **Authenticate**: VS Code will prompt you to sign in through your browser
4. **Use Tools**: Once authenticated, use MCP tools as normal

**Benefits of HTTP Mode:**
- ✅ Connect from multiple devices to the same server
- ✅ Share MCP server access across your team (with OAuth per-user isolation)
- ✅ Centralized session management and audit logs
- ✅ Production-grade security with Azure Entra ID

## Standalone Server Usage

You can run the server standalone for testing or integration with other MCP clients:

```bash
# Using npx (recommended)
DIRECT_LINE_SECRET=your_secret npx -y copilot-studio-agent-direct-line-mcp

# Or from source after building
node dist/index.js
```

The server uses stdio transport and will wait for MCP client connections.

## MCP Tools Reference

The MCP server provides 4 tools for interacting with Copilot Studio Agents. All tools use JSON-RPC 2.0 protocol and return structured responses.

### Tool 1: `start_conversation`

Initiates a new conversation with the Copilot Studio Agent.

**When to Use:**
- Starting a fresh conversation session
- Resetting context from a previous conversation
- Beginning a new user interaction

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `initialMessage` | string | Optional | First message to send to the agent. If omitted, conversation starts without a message. |

**Returns:**

```typescript
{
  conversationId: string;      // Unique conversation identifier
  status: "started";           // Confirmation status
  response?: string;           // Agent's response (if initialMessage provided)
  watermark?: string;          // Message tracking watermark
}
```

**Example Usage:**

*Without initial message:*
```json
{
  "name": "start_conversation",
  "arguments": {}
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "status": "started"
}
```

*With initial message:*
```json
{
  "name": "start_conversation",
  "arguments": {
    "initialMessage": "Hello! I need help with product sizing."
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "status": "started",
  "response": "Hi! I'd be happy to help you with product sizing. What product are you interested in?"
}
```

**Error Conditions:**

- **Token Generation Failed**: Invalid `DIRECT_LINE_SECRET`
- **Rate Limit Exceeded**: Too many conversation starts
- **Circuit Breaker Open**: Service experiencing issues

**Best Practices:**
- Store the `conversationId` for subsequent messages
- Use `initialMessage` when you know the user's intent upfront
- Don't start multiple conversations for the same user session
- Handle conversation expiration (30 minutes of inactivity)

---

### Tool 2: `send_message`

Sends a message to an active conversation with the Copilot Studio Agent.

**When to Use:**
- Continuing an existing conversation
- Sending user messages during a conversation flow
- Following up on previous agent responses

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Required | The message text to send to the agent |
| `conversationId` | string | Optional | Conversation ID from `start_conversation`. If omitted, a new conversation is created automatically. |

**Returns:**

```typescript
{
  conversationId: string;      // Conversation identifier
  response: string;            // Agent's response text
  activityId: string;          // Unique message activity ID
  watermark?: string;          // Message tracking watermark
}
```

**Example Usage:**

*With existing conversation:*
```json
{
  "name": "send_message",
  "arguments": {
    "message": "What's the price for size Medium?",
    "conversationId": "abc123xyz789"
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "response": "The price for size Medium is $49.99.",
  "activityId": "msg-456def"
}
```

*Without conversationId (auto-creates new conversation):*
```json
{
  "name": "send_message",
  "arguments": {
    "message": "Tell me about your return policy"
  }
}
```

Response:
```json
{
  "conversationId": "new-789ghi",
  "response": "Our return policy allows returns within 30 days...",
  "activityId": "msg-012jkl"
}
```

**Error Conditions:**

- **Conversation Not Found**: Invalid or expired `conversationId`
  - Solution: Start a new conversation with `start_conversation`
- **Message Too Long**: Message exceeds Direct Line limits (typically 65,536 characters)
  - Solution: Split message into smaller chunks
- **Conversation Expired**: No activity for 30 minutes
  - Solution: Start a new conversation
- **Empty Message**: Message parameter is empty or whitespace only
  - Solution: Provide valid message text

**Best Practices:**
- Always provide `conversationId` to maintain context
- Keep messages concise and focused
- Handle conversation expiration gracefully
- Store `activityId` for message tracking
- Don't send rapid-fire messages without waiting for responses

---

### Tool 3: `get_conversation_history`

Retrieves message history for an active conversation.

**When to Use:**
- Reviewing conversation context
- Debugging conversation flow
- Implementing conversation summaries
- Recovering context after connection loss

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | Required | Conversation ID from which to retrieve history |
| `limit` | number | Optional | Maximum number of messages to return (default: all messages) |

**Returns:**

```typescript
{
  conversationId: string;      // Conversation identifier
  messageCount: number;        // Number of messages returned
  totalMessages: number;       // Total messages in conversation
  messages: Array<{            // Array of message objects
    id: string;                // Activity ID
    timestamp: string;         // ISO 8601 timestamp
    from: "user" | "bot";      // Message sender
    text: string;              // Message content
    type: string;              // Activity type
  }>;
}
```

**Example Usage:**

*Get all messages:*
```json
{
  "name": "get_conversation_history",
  "arguments": {
    "conversationId": "abc123xyz789"
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "messageCount": 4,
  "totalMessages": 4,
  "messages": [
    {
      "id": "msg-001",
      "timestamp": "2024-01-15T10:30:00Z",
      "from": "user",
      "text": "Hello! I need help with product sizing.",
      "type": "message"
    },
    {
      "id": "msg-002",
      "timestamp": "2024-01-15T10:30:01Z",
      "from": "bot",
      "text": "Hi! I'd be happy to help you with product sizing.",
      "type": "message"
    },
    {
      "id": "msg-003",
      "timestamp": "2024-01-15T10:30:15Z",
      "from": "user",
      "text": "What's the price for size Medium?",
      "type": "message"
    },
    {
      "id": "msg-004",
      "timestamp": "2024-01-15T10:30:16Z",
      "from": "bot",
      "text": "The price for size Medium is $49.99.",
      "type": "message"
    }
  ]
}
```

*Get last 2 messages:*
```json
{
  "name": "get_conversation_history",
  "arguments": {
    "conversationId": "abc123xyz789",
    "limit": 2
  }
}
```

**Error Conditions:**

- **Conversation Not Found**: Invalid `conversationId`
- **Conversation Expired**: History not available after expiration
- **Invalid Limit**: Negative or non-numeric limit value

**Best Practices:**
- Use `limit` for large conversations to reduce response size
- Cache history locally to minimize API calls
- Messages are ordered chronologically (oldest first)
- Not all activity types are messages (e.g., typing indicators)

---

### Tool 4: `end_conversation`

Terminates an active conversation and releases server-side resources.

**When to Use:**
- User explicitly ends the conversation
- Conversation flow reaches a natural conclusion
- Cleaning up test conversations
- Resource management in high-volume scenarios

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | Required | Conversation ID to terminate |

**Returns:**

```typescript
{
  conversationId: string;      // Terminated conversation ID
  status: "ended";             // Confirmation status
  messageCount: number;        // Total messages exchanged
  duration?: number;           // Conversation duration in seconds
}
```

**Example Usage:**

```json
{
  "name": "end_conversation",
  "arguments": {
    "conversationId": "abc123xyz789"
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "status": "ended",
  "messageCount": 8,
  "duration": 145
}
```

**Error Conditions:**

- **Conversation Not Found**: Already ended or invalid ID
  - Not critical - conversation is already inactive
- **Conversation Already Ended**: Idempotent operation
  - Returns success with 0 message count

**Best Practices:**
- Always end conversations when flow completes
- Not strictly required (30-minute auto-timeout)
- Improves resource utilization in production
- Safe to call multiple times (idempotent)
- Ending a conversation removes it from the server's active conversation cache

---

## Tool Comparison Matrix

| Feature | start_conversation | send_message | get_conversation_history | end_conversation |
|---------|-------------------|--------------|-------------------------|------------------|
| **Creates Conversation** | ✅ Yes | ✅ If no conversationId | ❌ No | ❌ No |
| **Requires conversationId** | ❌ No | ⚠️ Optional | ✅ Yes | ✅ Yes |
| **Returns Agent Response** | ⚠️ If initialMessage | ✅ Always | ❌ No | ❌ No |
| **Modifies State** | ✅ Creates | ✅ Adds message | ❌ Read-only | ✅ Terminates |
| **Idempotent** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Can Fail After Timeout** | ❌ No | ✅ Yes | ✅ Yes | ⚠️ Soft fail |

## Error Handling Best Practices

**All Tools:**
- Always handle JSON parsing errors
- Check for `error` field in responses
- Implement exponential backoff for retries
- Log `conversationId` and `activityId` for debugging

**Conversation Expiration:**
```javascript
try {
  const response = await callTool("send_message", {
    message: "Hello",
    conversationId: oldConversationId
  });
} catch (error) {
  if (error.code === "ConversationError") {
    // Start new conversation
    const newConv = await callTool("start_conversation", {
      initialMessage: "Hello (recovering from expired conversation)"
    });
  }
}
```

**Circuit Breaker Handling:**
```javascript
try {
  const conv = await callTool("start_conversation", {});
} catch (error) {
  if (error.code === "CircuitBreakerError") {
    // Service is degraded, retry after 60 seconds
    await sleep(60000);
    return retry();
  }
}
```

## Next Steps

- **Examples**: See [Examples Guide](./EXAMPLES.md) for common usage patterns
- **Configuration**: Review [Configuration Guide](./CONFIGURATION.md) for advanced settings
- **Troubleshooting**: Visit [Troubleshooting Guide](./TROUBLESHOOTING.md) for common issues
- **Architecture**: Understand the system design in [Architecture Documentation](./ARCHITECTURE.md)
