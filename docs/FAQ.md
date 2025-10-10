# 🙋 Frequently Asked Questions

Common questions about the Copilot Studio Agent Direct Line MCP Server.

## General Questions

### What is the Copilot Studio Agent Direct Line MCP Server?

The Copilot Studio Agent Direct Line MCP Server is a Model Context Protocol (MCP) server that enables you to interact with Microsoft Copilot Studio Agents directly from your code editor (like VS Code) via the Direct Line 3.0 API.

### Which editors and tools support this MCP server?

The server works with any MCP-compatible client. Currently tested and supported:
- **VS Code** (recommended) - Version 1.96.0+ with GitHub Copilot extension
- **Claude Code** - Through MCP stdio or HTTP transport
- **Cursor** - Through MCP integration
- **Any MCP client** - Following the MCP specification

### Do I need a Microsoft Copilot Studio account?

Yes. You need:
1. A Microsoft Copilot Studio account
2. A published Copilot Studio Agent
3. Direct Line 3.0 channel enabled on your agent
4. A Direct Line secret key

## Installation & Setup

### What's the easiest way to install?

Use the one-click installation badge for VS Code:
1. Click the badge in the [README](../README.md)
2. Enter your Direct Line secret when prompted
3. Start using the MCP server immediately

### Can I use this without NPX?

Yes, you can install from source:

```bash
git clone https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp.git
cd copilot-studio-agent-direct-line-mcp
npm install
npm run build
```

Then configure VS Code to use the local build. See [Getting Started Guide](./GETTINGSTARTED.md#install-from-source-for-development).

### Where do I get my Direct Line secret?

1. Go to [Microsoft Copilot Studio](https://copilotstudio.microsoft.com/)
2. Select your agent
3. Navigate to **Channels** → **Direct Line 3.0**
4. Copy one of the secret keys

## Usage Questions

### Do conversations persist between VS Code restarts?

No. Conversations are maintained in-memory and expire after:
- 30 minutes of inactivity (Direct Line timeout)
- VS Code or MCP server restart

Always implement conversation expiration handling in production applications.

### Can I use multiple Copilot Studio Agents?

Yes, but you need to configure separate MCP server instances, each with its own Direct Line secret:

```json
{
  "servers": {
    "copilot-studio-sales": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:sales_agent_secret}"
      }
    },
    "copilot-studio-support": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:support_agent_secret}"
      }
    }
  }
}
```

### What's the difference between stdio and HTTP transport modes?

| Feature | Stdio Mode | HTTP Mode |
|---------|-----------|-----------|
| **Use Case** | Local development | Production deployment |
| **Authentication** | Direct Line secret only | Azure Entra ID OAuth + Direct Line |
| **Multi-user** | Single user | Multiple users with isolation |
| **Deployment** | VS Code local | Server deployment (Azure, Docker, etc.) |
| **Security** | Local process | OAuth, HTTPS, rate limiting |
| **Setup Complexity** | Simple | Moderate (requires Azure setup) |

### Can I deploy this as a shared service?

Yes, use HTTP transport mode with Azure Entra ID OAuth authentication. See:
- [Authentication Modes Guide](./AUTHENTICATION_MODES.md)
- [Setup and Deployment Guide](./SETUP_AND_DEPLOYMENT.md)
- [Azure Entra ID Setup Guide](./ENTRA_ID_SETUP.md)

## Technical Questions

### What happens when a conversation expires?

The server returns a `ConversationError`. Your application should handle this by starting a new conversation:

```javascript
try {
  const response = await callTool("send_message", {
    message: "Hello",
    conversationId: existingId
  });
} catch (error) {
  if (error.code === "ConversationError") {
    // Start new conversation
    const newConv = await callTool("start_conversation", {
      initialMessage: "Hello"
    });
  }
}
```

### How does the circuit breaker work?

The circuit breaker protects against cascading failures:

1. **Closed** (normal): All requests go through
2. **Open** (degraded): After 5 consecutive failures, requests are blocked for 60 seconds
3. **Half-Open** (recovery): After timeout, one request is allowed to test if service recovered

User errors (invalid input, conversation expired) don't trigger the circuit breaker.

### Are Direct Line tokens cached?

Yes, tokens are cached in-memory and proactively refreshed 5 minutes before expiration. Benefits:
- Reduced API calls
- Better performance
- Automatic token renewal

Tokens are never persisted to disk for security.

### What security measures are in place?

**Stdio Mode:**
- Secrets never logged (masked in logs)
- Local process only (no network exposure)
- Environment variable protection

**HTTP Mode:**
- Azure Entra ID OAuth 2.0 authentication
- HTTPS required in production
- Rate limiting (configurable)
- CORS protection
- Session encryption
- Security headers (HSTS, CSP, etc.)

### How do I handle rate limiting?

Implement exponential backoff with jitter:

```javascript
async function sendWithRetry(message, conversationId, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await callTool("send_message", { message, conversationId });
    } catch (error) {
      if (error.code === "RateLimitError" && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await sleep(delay);
        attempt++;
        continue;
      }
      throw error;
    }
  }
}
```

## Deployment Questions

### Can I deploy to Azure?

Yes! We provide deployment templates for:
- Azure Container Apps (recommended)
- Azure Container Instances
- Azure App Service
- Azure Kubernetes Service

See [Setup and Deployment Guide](./SETUP_AND_DEPLOYMENT.md#production-deployment).

### What are the hosting requirements?

**Minimum:**
- Node.js 18+
- 512MB RAM
- 1 vCPU

**Recommended (production):**
- Node.js 20+
- 1GB RAM
- 2 vCPU
- HTTPS with valid certificate
- Azure Entra ID configured

### How do I monitor the server in production?

Use Azure Application Insights or similar monitoring tools:

```bash
# Add to your deployment
LOG_LEVEL=info
NODE_ENV=production

# Integrate with Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=your_connection_string
```

Monitor:
- Error rates
- Response times
- Circuit breaker state changes
- Token generation failures
- OAuth authentication failures

## Troubleshooting

### Why isn't my MCP server showing up in VS Code?

Check:
1. VS Code version is 1.96.0+
2. GitHub Copilot extension is installed
3. `.vscode/mcp.json` is in workspace root
4. JSON syntax is valid
5. Restart VS Code completely

See [Troubleshooting Guide](./TROUBLESHOOTING.md#server-not-showing-up-in-mcp-panel).

### Why do I get "Failed to generate Direct Line token"?

Causes:
1. Invalid `DIRECT_LINE_SECRET`
2. Direct Line channel not enabled
3. Network connectivity issues
4. Bot not published

Solutions in [Troubleshooting Guide](./TROUBLESHOOTING.md#failed-to-generate-direct-line-token).

### How do I enable debug logging?

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "copilot-studio": {
      "env": {
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

Then check: View → Output → "Model Context Protocol"

## Performance Questions

### How many concurrent conversations can the server handle?

**Stdio Mode:** One user, unlimited conversations (memory limited)

**HTTP Mode:**
- Depends on server resources
- Each conversation uses ~1-2MB memory
- Recommended: 100-500 concurrent conversations per 1GB RAM
- Use horizontal scaling for higher loads

### What's the latency for message exchanges?

Typical latency:
- MCP overhead: <10ms
- Token generation: 100-200ms (cached after first use)
- Direct Line API: 200-500ms
- Agent processing: Variable (depends on your agent)

Total: Usually 300-700ms for message round-trip

### Can I reduce memory usage?

Yes:
- End conversations when done
- Implement conversation cleanup
- Reduce TOKEN_REFRESH_INTERVAL for faster expiration
- Use HTTP mode with session timeouts

## Contributing

### How can I contribute?

See [Contributing Guide](../CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Pull request process
- Testing requirements

### Where do I report bugs?

File issues on [GitHub Issues](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues) with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Logs (with secrets redacted)
- Environment details (VS Code version, Node.js version, etc.)

## Additional Resources

- **Getting Started**: [Getting Started Guide](./GETTINGSTARTED.md)
- **Usage Examples**: [Examples Guide](./EXAMPLES.md)
- **Configuration**: [Configuration Guide](./CONFIGURATION.md)
- **Architecture**: [Architecture Documentation](./ARCHITECTURE.md)
- **Error Handling**: [Error Handling Guide](./ERROR_HANDLING.md)
