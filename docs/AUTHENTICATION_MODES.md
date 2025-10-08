# Authentication Modes

The Copilot Studio Agent Direct Line MCP Server supports multiple authentication modes depending on how it's deployed and accessed.

## Overview

| Mode | Transport | Authentication | Use Case |
|------|-----------|----------------|----------|
| **Anonymous** | stdio | Direct Line Secret only | Local development, testing |
| **User Credentials** | stdio | Username + Password or Token | VS Code with user auth |
| **OAuth 2.0** | HTTP | Azure Entra ID | Production web deployments |

## 1. Anonymous Mode (Default for stdio)

**Use**: Local development, personal use

The MCP server uses only the Direct Line secret to communicate with the Copilot Studio Agent. No user authentication required.

### Configuration (`.vscode/mcp.json`):

```json
{
  "servers": {
    "copilot-studio-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "your-direct-line-secret",
        "AUTH_MODE": "anonymous"
      }
    }
  }
}
```

## 2. User Credentials Mode (stdio with authentication)

**Use**: VS Code in enterprise environments requiring user identification

Users must authenticate before using MCP tools. Credentials are validated against Azure Entra ID or a custom auth provider.

### Configuration (`.vscode/mcp.json`):

```json
{
  "inputs": [
    {
      "id": "direct_line_secret",
      "type": "promptString",
      "description": "Direct Line secret key"
    },
    {
      "id": "user_email",
      "type": "promptString",
      "description": "Your email address for authentication"
    },
    {
      "id": "user_token",
      "type": "promptString",
      "password": true,
      "description": "Your authentication token or password"
    }
  ],
  "servers": {
    "copilot-studio-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}",
        "AUTH_MODE": "user_credentials",
        "REQUIRE_AUTH": "true",
        "USER_EMAIL": "${input:user_email}",
        "USER_TOKEN": "${input:user_token}"
      }
    }
  }
}
```

### How It Works:

1. **First Tool Call**: When any tool is called, the server checks if user is authenticated
2. **Authentication Prompt**: If not authenticated, the tool returns an error prompting to use the `authenticate` tool
3. **`authenticate` Tool**: Users call this tool with their credentials
4. **Token Validation**: Server validates credentials against configured auth provider
5. **Session Creation**: On success, creates an authenticated session
6. **Subsequent Calls**: All future tool calls are executed with user context

### Available Authentication Tool:

```typescript
// authenticate tool - Call this first before using other tools
{
  name: "authenticate",
  description: "Authenticate user before accessing other tools",
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Your email address"
      },
      token: {
        type: "string",
        description: "Your authentication token or password"
      }
    },
    required: ["email", "token"]
  }
}
```

### Usage Example in VS Code:

```
User: Start a conversation with my agent

Copilot: I need to authenticate you first. Let me call the authenticate tool.
[Calls authenticate with user's credentials]
[On success, proceeds with start_conversation]
```

## 3. OAuth 2.0 Mode (HTTP transport)

**Use**: Production web deployments, enterprise applications

Full OAuth 2.0 flow with Azure Entra ID for browser-based authentication.

### Configuration (`.env`):

```bash
# Transport Mode
MCP_TRANSPORT_MODE=http
HTTP_PORT=3000

# Direct Line
DIRECT_LINE_SECRET=your-direct-line-secret

# Authentication
AUTH_MODE=oauth
REQUIRE_AUTH=true

# Azure Entra ID OAuth
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=https://your-domain.com/auth/callback
ENTRA_SCOPES=openid,profile,email

# Session
SESSION_SECRET=your-session-secret-min-32-chars
```

### How It Works:

1. **User visits** `/auth/login`
2. **Redirected to** Microsoft login page
3. **After authentication**, redirected back to `/auth/callback`
4. **Session created** with user info and tokens
5. **MCP tools** require valid session cookie

### OAuth Endpoints:

- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - End user session
- `GET /auth/user` - Get current user info

## Configuration Comparison

### For VS Code (stdio):

**Anonymous** (simplest):
```json
{
  "env": {
    "DIRECT_LINE_SECRET": "secret",
    "AUTH_MODE": "anonymous"
  }
}
```

**User Credentials** (recommended for enterprise):
```json
{
  "env": {
    "DIRECT_LINE_SECRET": "secret",
    "AUTH_MODE": "user_credentials",
    "REQUIRE_AUTH": "true"
  }
}
```

### For Production (HTTP):

```bash
MCP_TRANSPORT_MODE=http
AUTH_MODE=oauth
REQUIRE_AUTH=true
# ... OAuth configuration
```

## Security Considerations

### Anonymous Mode
- ✅ Simple setup
- ⚠️ No user identification
- ⚠️ All users share same conversations
- ❌ Not suitable for multi-user environments

### User Credentials Mode
- ✅ User identification
- ✅ Isolated conversations per user
- ✅ Audit logging with user context
- ⚠️ Credentials stored in VS Code config (use tokens, not passwords)
- ✅ Suitable for enterprise VS Code usage

### OAuth Mode
- ✅ Industry-standard authentication
- ✅ No credential storage in client
- ✅ Token refresh and expiration
- ✅ Full audit trail
- ✅ Production-ready

## Implementation Details

### User Credentials Validation

The server validates user credentials against:

1. **Azure Entra ID** (if configured):
   - Uses MSAL library
   - Validates email + token
   - Returns user profile

2. **Custom Auth Provider** (if configured):
   - HTTP POST to configured endpoint
   - Returns user info on success

3. **Static Credentials** (development only):
   - Configured in environment
   - Never use in production

### Session Management

**Stdio Mode**:
- In-memory session storage
- Sessions persist for server lifetime
- Use `logout` tool to end session

**HTTP Mode**:
- Session cookies (encrypted)
- Configurable timeout (default: 24 hours)
- Redis support for distributed sessions

## Migration Guide

### From Anonymous to User Credentials:

1. Update `.vscode/mcp.json` to prompt for credentials
2. Set `REQUIRE_AUTH=true`
3. Configure auth provider
4. Restart MCP server in VS Code
5. First tool call will prompt for authentication

### From User Credentials to OAuth:

1. Deploy server in HTTP mode
2. Configure Azure Entra ID app
3. Set up OAuth endpoints
4. Update client to use HTTP transport
5. Implement OAuth flow in client app

## Troubleshooting

### "Authentication required" error

**Issue**: Tool calls fail with authentication error

**Solutions**:
- Call `authenticate` tool first
- Check credentials are correct
- Verify auth provider is configured
- Check session hasn't expired

### "Invalid credentials" error

**Issue**: Authentication fails

**Solutions**:
- Verify email/token are correct
- Check Azure Entra ID app permissions
- Ensure user exists in Azure AD
- Check auth provider is accessible

### Session expires quickly

**Issue**: Need to re-authenticate frequently

**Solutions**:
- Increase session timeout
- Use token refresh (OAuth mode)
- Configure persistent sessions
- Check server isn't restarting

## Best Practices

✅ **Do**:
- Use OAuth for production HTTP deployments
- Use user credentials mode for enterprise VS Code
- Store credentials securely (use tokens, not passwords)
- Implement session timeout
- Log authentication events
- Rotate secrets regularly

❌ **Don't**:
- Use anonymous mode in multi-user environments
- Store passwords in VS Code configuration
- Share authentication tokens between users
- Disable authentication in production
- Use weak session secrets

## Next Steps

- [Azure Entra ID Setup](./ENTRA_ID_SETUP.md) - Configure OAuth
- [VS Code Development](./VSCODE_DEVELOPMENT.md) - Local development setup
- [Setup and Deployment](./SETUP_AND_DEPLOYMENT.md) - Full deployment guide
