# 📝 Troubleshooting Guide

This guide provides solutions for common issues you may encounter with the Copilot Studio Agent Direct Line MCP Server.

## Table of Contents

- [VS Code MCP Connection Issues](#vs-code-mcp-connection-issues)
- [Direct Line Connection Issues](#direct-line-connection-issues)
- [OAuth Authentication Issues](#oauth-authentication-issues-http-mode)
- [Common Errors](#common-errors)
- [VS Code MCP Configuration Guide](#vs-code-mcp-configuration-guide)

## VS Code MCP Connection Issues

### Server Not Showing Up in MCP Panel

1. **Verify VS Code Version**: Ensure you're running VS Code 1.96.0 or later
   ```bash
   code --version
   ```
2. **Check mcp.json Location**: File must be at `.vscode/mcp.json` in workspace root
3. **Validate JSON Syntax**: Use a JSON validator to check for syntax errors
4. **Check GitHub Copilot**: Ensure GitHub Copilot extension is installed and activated
5. **Restart VS Code**: Quit completely (not just reload window) and restart

### MCP Server Fails to Start

**Symptom**: Server shows error status in MCP panel

**Common Causes & Solutions:**

#### 1. Node.js Not Found

- **Error**: `command not found: node` or `command not found: npx`
- **Solution**: Install Node.js 18+ and ensure it's in your PATH
- **Test**: Run `node --version` in terminal

#### 2. Invalid DIRECT_LINE_SECRET

- **Error**: `Failed to generate Direct Line token`
- **Solution**: Verify secret in Copilot Studio → Channels → Direct Line
- **Check**: Secret must start with your channel identifier

#### 3. NPX Package Not Found

- **Error**: `package not found: copilot-studio-agent-direct-line-mcp`
- **Solution**: Check internet connection, npm registry accessibility
- **Alternative**: Use local source installation

#### 4. Path Issues (Source Installation)

- **Error**: `Cannot find module`
- **Solution**: Use absolute path in mcp.json, verify dist/index.js exists
- **Build first**: `npm run build`

### MCP Tools Not Appearing in GitHub Copilot

1. **Select Tools Manually**: In Copilot Chat, click "Select Tools" and enable MCP tools
2. **Check Server Status**: Look for green indicator in MCP Server panel
3. **Restart MCP Server**: Click "Restart" in MCP panel
4. **Check Logs**: View Output → Model Context Protocol for errors

### HTTP Transport Connection Issues

#### Authentication Loop

- **Symptom**: Repeatedly redirected to login page
- **Solution**:
  - Clear cookies/cache for the server URL
  - Check `SESSION_SECRET` is consistent
  - Verify redirect URI in Azure Entra ID matches server configuration

#### CORS Errors

- **Symptom**: `Access-Control-Allow-Origin` errors in browser console
- **Solution**: Add VS Code origin to `ALLOWED_ORIGINS` environment variable
  ```bash
  ALLOWED_ORIGINS=http://localhost:3000,vscode://vscode
  ```

#### OAuth Discovery Failed

- **Symptom**: VS Code can't find OAuth endpoints
- **Solution**: Verify server is running and accessible
- **Test**: Open `https://your-server/.well-known/oauth-authorization-server` in browser
- **Should return**: JSON with authorization/token endpoints

### Debugging Tips

#### Enable Verbose Logging

```json
{
  "servers": {
    "copilot-studio": {
      "env": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### View MCP Server Logs

1. Open VS Code Output panel (View → Output)
2. Select "Model Context Protocol" from dropdown
3. Look for connection attempts and errors

#### Test Server Standalone

```bash
# Stdio mode
DIRECT_LINE_SECRET=your_secret node dist/index.js

# HTTP mode
MCP_TRANSPORT_MODE=http HTTP_PORT=3000 \
DIRECT_LINE_SECRET=your_secret \
ENTRA_TENANT_ID=your_tenant \
ENTRA_CLIENT_ID=your_client \
ENTRA_CLIENT_SECRET=your_secret \
npm start
```

#### Common Fixes

- ✅ Completely quit and restart VS Code (not just reload window)
- ✅ Clear npm cache: `npm cache clean --force`
- ✅ Reinstall dependencies if using source: `rm -rf node_modules && npm install`
- ✅ Check firewall isn't blocking npx or node
- ✅ Verify antivirus isn't quarantining executables

## Direct Line Connection Issues

### Failed to Generate Direct Line Token

**Symptom**: Error when trying to start conversation or send messages

**Solutions:**

1. **Verify Secret**: Check that `DIRECT_LINE_SECRET` is correct in your configuration
2. **Check Bot Status**: Ensure your Copilot Studio Agent is published and Direct Line channel is enabled
3. **Review Logs**: Server logs will show connection attempts and errors
4. **Test Secret**: Verify the secret in Copilot Studio:
   - Go to Copilot Studio → Your Agent → Channels
   - Select Direct Line 3.0
   - Regenerate keys if needed

### Conversation Not Found or Expired

**Symptom**: `ConversationError: Conversation not found or expired`

**Solutions:**

- Conversations expire after 30 minutes of inactivity
- Start a new conversation with `start_conversation` tool
- Check conversation ID is being passed correctly in subsequent calls
- Implement conversation expiration handling in your code

**Example Handling:**

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
      initialMessage: "Hello"
    });
  }
}
```

### Circuit Breaker is OPEN

**Symptom**: `CircuitBreakerError: Circuit breaker is OPEN`

**Solutions:**

- The server detected multiple failures and is protecting against cascading failures
- Wait 60 seconds for the circuit breaker to attempt recovery
- Check Direct Line API connectivity
- Review server logs for the root cause (authentication, network, or service issues)

**Prevention:**

- Implement exponential backoff in your application
- Monitor for persistent failures
- Check server health before sending bursts of requests

## OAuth Authentication Issues (HTTP Mode)

### OAuth Flow Not Initiating

**Symptom**: Browser doesn't open or shows 404 error

**Solutions:**

- Verify environment variables are set:
  - `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`
  - `ENTRA_REDIRECT_URI` matches your Azure app registration
- Check OAuth discovery endpoint is accessible: `GET /.well-known/oauth-authorization-server`
- Verify Azure Entra ID app registration is configured correctly

### "Invalid State Parameter" Error

**Symptom**: Authentication fails with state mismatch error

**Solutions:**

This indicates a CSRF protection failure or expired auth flow:

- Restart the authentication flow (don't reuse old authorization URLs)
- Check that cookies are enabled in your browser
- Verify `SESSION_SECRET` is consistent (not changing between requests)
- Auth flows expire after 10 minutes - complete the flow quickly

### "Token Refresh Failed" or "Refresh Token Invalid"

**Symptom**: Session becomes invalid after the access token expires

**Solutions:**

- User must re-authenticate
- This is expected behavior when refresh tokens expire or are invalidated
- Direct users to `/auth/login` to re-authenticate
- Check Azure Entra ID for token lifetime policies

### Bearer Token Authentication Fails

**Symptom**: VS Code shows authentication error or 401 Unauthorized

**Solutions:**

- Verify the session token was correctly returned in the callback
- Check that the token is being sent in the `Authorization: Bearer <token>` header
- Ensure the session hasn't expired (24-hour timeout)
- Try signing out and back in: visit `/auth/logout` then `/auth/login`

### "Authentication Required" in HTTP Mode

**Symptom**: All requests return 401 Unauthorized

**Solutions:**

- HTTP mode requires OAuth authentication
- Visit the server URL in a browser (e.g., `http://localhost:3000`)
- Click "Sign in with Microsoft" and complete the OAuth flow
- Ensure your MCP client supports OAuth 2.0 authentication
- For VS Code: The extension will automatically handle the OAuth flow

## Common Errors

### Message Too Long

**Error**: `ValidationError: Message exceeds maximum length`

**Solution**: Direct Line has a message length limit (typically 65,536 characters)

- Split long messages into smaller chunks
- Summarize content before sending
- Use conversation history to maintain context across messages

### Rate Limit Exceeded

**Error**: `RateLimitError: Too many requests`

**Solution**:

- Implement exponential backoff with jitter
- Reduce request frequency
- Check rate limiting configuration in HTTP mode
- Monitor request patterns and adjust client behavior

### Connection Timeout

**Error**: `NetworkError: Request timeout`

**Solution**:

- Check internet connection
- Verify Direct Line service status
- Increase timeout configuration if needed
- Implement retry logic with exponential backoff

## VS Code MCP Configuration Guide

The `.vscode/mcp.json` file configures how VS Code connects to MCP servers.

### Configuration File Location

Create the file at: `.vscode/mcp.json` in your workspace root

### Stdio Transport (Local Development)

**Recommended: Using input prompts for secrets**

```json
{
  "inputs": [
    {
      "id": "direct_line_secret",
      "type": "promptString",
      "description": "Direct Line secret key from your Copilot Studio Agent",
      "password": true
    }
  ],
  "servers": {
    "copilot-studio-agent-direct-line-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}",
        "LOG_LEVEL": "info",
        "TOKEN_REFRESH_INTERVAL": "1800000"
      }
    }
  }
}
```

**Alternative: Hardcoded secret (not recommended for shared projects)**

```json
{
  "servers": {
    "copilot-studio-agent-direct-line-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "your_secret_here"
      }
    }
  }
}
```

**Local development from source:**

```json
{
  "servers": {
    "copilot-studio-local": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/copilot-studio-agent-direct-line-mcp/dist/index.js"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}"
      }
    }
  }
}
```

### HTTP Transport (Remote Server)

**OAuth-enabled remote server:**

```json
{
  "servers": {
    "copilot-studio-production": {
      "type": "http",
      "url": "https://your-mcp-server.azurecontainerapps.io/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "https://your-mcp-server.azurecontainerapps.io/authorize",
        "tokenUrl": "https://your-mcp-server.azurecontainerapps.io/auth/token",
        "clientId": "optional-client-id",
        "scopes": ["openid", "profile", "email"]
      }
    }
  }
}
```

**Local HTTP server (for testing):**

```json
{
  "servers": {
    "copilot-studio-http-local": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "http://localhost:3000/authorize",
        "tokenUrl": "http://localhost:3000/auth/token"
      }
    }
  }
}
```

### Configuration Options

**Server Configuration Fields:**
- `type`: Transport mode (`stdio` or `http`)
- `command`: Executable to run (stdio only)
- `args`: Command-line arguments array
- `env`: Environment variables object
- `url`: Server endpoint URL (http only)
- `auth`: Authentication configuration (http only)

**Input Types:**
- `promptString`: Text input (use `password: true` for secrets)
- `promptNumber`: Numeric input
- `promptBoolean`: Yes/no selection

**Environment Variables:**
- `DIRECT_LINE_SECRET`: Required - Your Direct Line secret key
- `LOG_LEVEL`: Optional - `debug` | `info` | `warn` | `error` (default: `info`)
- `TOKEN_REFRESH_INTERVAL`: Optional - Token refresh interval in milliseconds (default: `1800000`)
- `NODE_ENV`: Optional - `development` | `production`

**Best Practices:**
- ✅ Use input prompts for secrets to avoid committing them
- ✅ Name servers descriptively (e.g., `copilot-studio-dev`, `copilot-studio-prod`)
- ✅ Use absolute paths when running from source
- ✅ Set `password: true` on secret inputs to mask values
- ❌ Don't commit secrets in hardcoded configurations
- ❌ Don't share `.vscode/mcp.json` with hardcoded secrets

## Getting More Help

If you continue to experience issues:

1. **Check Logs**: Enable debug logging to see detailed error messages
2. **Review Documentation**:
   - [Getting Started Guide](./GETTINGSTARTED.md)
   - [Configuration Guide](./CONFIGURATION.md)
   - [Architecture Documentation](./ARCHITECTURE.md)
3. **Report Issues**: File a bug report on GitHub with:
   - VS Code version
   - Node.js version
   - Server logs (with secrets redacted)
   - Steps to reproduce the issue
4. **Community Support**: Join our discussions on GitHub

## Next Steps

- **Configuration**: Review [Configuration Guide](./CONFIGURATION.md) for advanced settings
- **Usage Guide**: Check [Usage Guide](./USAGE_GUIDE.md) for detailed tool reference
- **Examples**: See [Examples Guide](./EXAMPLES.md) for common patterns
- **FAQ**: Visit [FAQ](./FAQ.md) for frequently asked questions
