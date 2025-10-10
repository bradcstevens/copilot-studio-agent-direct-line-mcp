# VS Code Local Development Quick Start

Quick reference guide for developing the Copilot Studio Agent Direct Line MCP Server in VS Code.

## Prerequisites

✅ VS Code or VS Code Insiders installed
✅ Repository cloned locally
✅ Dependencies installed (`npm install`)
✅ `.env` file configured with `DIRECT_LINE_SECRET`

## Quick Setup (3 Steps)

### 1. Build the Project

```bash
npm run build
```

### 2. Create `.vscode/mcp.json`

**Option A: Using .env file (Recommended)**
```json
{
  "servers": {
    "copilot-studio-local": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

**Option B: With inline environment variables**
```json
{
  "servers": {
    "copilot-studio-local": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "DIRECT_LINE_SECRET": "your-secret-here",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### 3. Start in VS Code

1. Open MCP panel in VS Code
2. Find "copilot-studio-local"
3. Click **Start**
4. Open GitHub Copilot Chat > Agent Mode
5. Test with: `Start a conversation with my agent`

## Development Workflows

### Workflow 1: Build + Test Cycle

**Best for:** Testing changes in VS Code

```bash
# Make code changes
npm run build          # Rebuild
# Restart MCP server in VS Code
# Test in Copilot Chat
```

### Workflow 2: Hot Reload Development

**Best for:** Rapid iteration

1. **Create `dev-wrapper.sh`**:
   ```bash
   #!/bin/bash
   cd "$(dirname "$0")"
   npm run dev
   ```

2. **Make executable**:
   ```bash
   chmod +x dev-wrapper.sh
   ```

3. **Update `.vscode/mcp.json`**:
   ```json
   {
     "servers": {
       "copilot-studio-dev": {
         "type": "stdio",
         "command": "/full/path/to/dev-wrapper.sh"
       }
     }
   }
   ```

4. **Develop**:
   - Changes auto-reload via tsx watch
   - Monitor logs in MCP panel

### Workflow 3: HTTP Mode Testing

**Best for:** Testing OAuth and HTTP endpoints

1. **Update `.env`**:
   ```bash
   MCP_TRANSPORT_MODE=http
   HTTP_PORT=3000
   SESSION_SECRET=dev-secret-min-32-characters-long
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Test endpoints**:
   ```bash
   # Health check
   curl http://localhost:3000/health

   # Expected: {"status":"ok","timestamp":...}
   ```

4. **Test web authentication**:
   - Open browser to `http://localhost:3000/`
   - Click "Sign in with Microsoft"
   - Complete OAuth flow
   - See success page: "You can now close this browser tab"

5. **Switch back to stdio**:
   ```bash
   # In .env
   MCP_TRANSPORT_MODE=stdio
   ```

## Debugging with Breakpoints

### Setup Debugger

**Create `.vscode/launch.json`**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["--import", "tsx/esm"],
      "env": {
        "DIRECT_LINE_SECRET": "${env:DIRECT_LINE_SECRET}",
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Session

1. Set breakpoints in `.ts` files
2. Press **F5** or select "Debug MCP Server"
3. Server starts with debugger attached
4. Breakpoints hit when server processes requests

## Configuration Examples

### Stdio Mode (Default)

**.env**:
```bash
DIRECT_LINE_SECRET=your-secret
MCP_TRANSPORT_MODE=stdio
LOG_LEVEL=debug
NODE_ENV=development
```

**.vscode/mcp.json**:
```json
{
  "servers": {
    "copilot-studio-local": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

### HTTP Mode with OAuth
Generate a secret for the **SESSION_SECRET** variable: 
```bash
 node -e "console.log(require('crypto').randomBytes(32)
  .toString('hex'))"
```

**.env**:
```bash
DIRECT_LINE_SECRET=your-secret
MCP_TRANSPORT_MODE=http
HTTP_PORT=3000
SESSION_SECRET=your-32-char-secret
LOG_LEVEL=debug

# Azure Entra ID (optional)
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Run**:
```bash
npm run dev
```

**.vscode/mcp.json** (VS Code HTTP MCP Integration):
```json
{
  "servers": {
    "copilot-studio-http": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Note**: For HTTP transport, the server must be started separately (`npm start` or `npm run dev`). The VS Code MCP extension will connect to the running HTTP server instead of launching it via stdio.

## Available MCP Tools

The server provides 4 MCP tools for interacting with your Copilot Studio Agent via Direct Line:

### 1. start_conversation
Start a new conversation with the Copilot Studio Agent.

**Parameters**:
- `initialMessage` (string, optional): First message to send

**Example**:
```json
{
  "name": "start_conversation",
  "arguments": {
    "initialMessage": "Hello, I need help with my order"
  }
}
```

**Returns**:
```json
{
  "conversationId": "ABC123...",
  "status": "started",
  "response": "Hello! I'd be happy to help...",
  "activityId": "ABC123|0000000"
}
```

### 2. send_message
Send a message to an existing conversation.

**Parameters**:
- `message` (string, required): The message text to send
- `conversationId` (string, optional): Conversation ID to continue (creates new if omitted)

**Example**:
```json
{
  "name": "send_message",
  "arguments": {
    "message": "What's my order status?",
    "conversationId": "ABC123..."
  }
}
```

**Returns**:
```json
{
  "conversationId": "ABC123...",
  "response": "Let me check that for you...",
  "activityId": "ABC123|0000002"
}
```

### 3. get_conversation_history
Retrieve message history for a conversation.

**Parameters**:
- `conversationId` (string, required): Conversation ID
- `limit` (number, optional): Maximum number of messages to return

**Example**:
```json
{
  "name": "get_conversation_history",
  "arguments": {
    "conversationId": "ABC123...",
    "limit": 10
  }
}
```

**Returns**:
```json
{
  "conversationId": "ABC123...",
  "messageCount": 2,
  "totalMessages": 2,
  "messages": [
    {
      "id": "ABC123|0000001",
      "type": "message",
      "timestamp": "2025-10-10T20:01:46Z",
      "from": {
        "id": "bot-id",
        "name": "Your Agent Name",
        "role": "bot"
      },
      "text": "Hello! How can I help?"
    }
  ]
}
```

### 4. end_conversation
End an existing conversation and clean up resources.

**Parameters**:
- `conversationId` (string, required): Conversation ID to terminate

**Example**:
```json
{
  "name": "end_conversation",
  "arguments": {
    "conversationId": "ABC123..."
  }
}
```

**Returns**:
```json
{
  "conversationId": "ABC123...",
  "status": "ended",
  "messageCount": 2
}
```

## Testing Your Changes

### Unit Tests

```bash
# Run all tests
npm test

# Watch mode (auto-run on changes)
npm run test:watch

# With coverage
npm run test:coverage
```

### Integration Testing

```bash
# Test MCP integration
export DIRECT_LINE_SECRET=your-secret
npx tsx tests/test-mcp-client.ts
```

### Manual Testing in VS Code

1. **Make changes** to source code
2. **Rebuild**: `npm run build`
3. **Restart MCP server** in VS Code
4. **Test in Copilot Chat**:
   - Open GitHub Copilot Chat
   - Enable Agent Mode
   - Use MCP tools

## Common Issues & Solutions

### Server Not Appearing in VS Code

❌ **Problem**: MCP server doesn't show in panel

✅ **Solutions**:
- Verify `.vscode/mcp.json` exists
- Use absolute paths, not relative
- Restart VS Code completely
- Check VS Code MCP extension is enabled

### Build Errors

❌ **Problem**: TypeScript compilation fails

✅ **Solutions**:
```bash
# Clean rebuild
rm -rf dist/
npm run build

# Check for type errors
npm run lint
```

### Environment Variables Not Loading

❌ **Problem**: Server can't find `DIRECT_LINE_SECRET`

✅ **Solutions**:
- Verify `.env` exists in project root
- Check `.env` has `DIRECT_LINE_SECRET=...`
- Ensure no typos in variable names
- Review logs for "[Config] Environment loaded"

### Tools Not Appearing in Copilot

❌ **Problem**: MCP server starts but no tools available

✅ **Solutions**:
- Check server logs show "✅ Server ready"
- Verify `dist/index.js` exists
- Enable Agent Mode in Copilot Chat
- Click "Select Tools" to choose MCP tools

### Port Already in Use (HTTP Mode)

❌ **Problem**: `EADDRINUSE` error on port 3000

✅ **Solutions**:
```bash
# Find process using port
lsof -i :3000

# Kill process or change port
HTTP_PORT=3001 npm run dev
```

### MCP Connection Failures

❌ **Problem**: VS Code MCP extension can't connect to server

✅ **Solutions**:
```bash
# 1. Verify server is built and exists
ls -la dist/index.js

# 2. Check MCP configuration
cat .vscode/mcp.json

# 3. Test server manually
node dist/index.js

# 4. View MCP extension logs
# VS Code > Output > Model Context Protocol

# 5. Restart VS Code MCP extension
# Command Palette > "Developer: Reload Window"
```

**Common MCP connection errors:**
- `ENOENT: no such file or directory` - Run `npm run build` first
- `MODULE_NOT_FOUND` - Run `npm install` to install dependencies
- `Server process exited with code 1` - Check server logs in MCP Output panel
- `Timeout waiting for server` - Server may be hanging, check for errors in code

### OAuth Authentication Failures (HTTP Mode)

❌ **Problem**: OAuth sign-in fails or redirects to error page

✅ **Solutions**:
```bash
# 1. Verify Entra ID configuration
echo $ENTRA_CLIENT_ID
echo $ENTRA_TENANT_ID
echo $ENTRA_REDIRECT_URI

# 2. Check redirect URI matches exactly
# Must be: http://localhost:3000/auth/callback
# Or your deployed URL + /auth/callback

# 3. Verify client secret is valid
# Check Azure Portal > App Registration > Certificates & secrets

# 4. Enable debug logging
LOG_LEVEL=debug npm run dev

# 5. Check browser console for errors
# F12 in browser > Console tab
```

**Common OAuth errors:**
- `AADSTS50011: Redirect URI mismatch` - Update `ENTRA_REDIRECT_URI` to match Azure Portal
- `AADSTS70001: Application not found` - Verify `ENTRA_CLIENT_ID` and `ENTRA_TENANT_ID`
- `AADSTS7000215: Invalid client secret` - Regenerate secret in Azure Portal
- `AADSTS50020: User account from external provider` - Grant admin consent in Azure Portal

### HTTP Transport Errors

❌ **Problem**: HTTP mode fails to start or accept connections

✅ **Solutions**:
```bash
# 1. Verify HTTP mode configuration
cat .env | grep MCP_TRANSPORT_MODE
# Should show: MCP_TRANSPORT_MODE=http

# 2. Check required environment variables
cat .env | grep -E "HTTP_PORT|SESSION_SECRET"

# 3. Generate new SESSION_SECRET if needed
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Test HTTP server directly
curl http://localhost:3000/health

# 5. Check server logs for errors
npm run dev 2>&1 | grep -i error
```

**Common HTTP transport errors:**
- `SESSION_SECRET must be at least 32 characters` - Generate longer secret (see above)
- `Port 3000 already in use` - Change `HTTP_PORT` or kill process using port
- `CORS error in browser` - Add your origin to `ALLOWED_ORIGINS` in `.env`
- `Cannot POST /mcp` - Ensure middleware is properly configured

### MCP Extension Issues

❌ **Problem**: VS Code MCP extension not working correctly

✅ **Solutions**:

1. **Verify MCP extension is installed:**
   - VS Code > Extensions > Search "Model Context Protocol"
   - Install if not present

2. **Check MCP extension version:**
   ```bash
   # Command Palette > "Extensions: Show Installed Extensions"
   # Look for "Model Context Protocol"
   ```

3. **Reload VS Code window:**
   ```bash
   # Command Palette > "Developer: Reload Window"
   ```

4. **Clear VS Code MCP cache:**
   ```bash
   # Close VS Code
   rm -rf ~/.vscode/mcp-cache  # or equivalent on Windows
   # Restart VS Code
   ```

5. **View MCP extension logs:**
   - VS Code > Output > Select "Model Context Protocol" from dropdown
   - Look for connection errors or configuration issues

**Common MCP extension errors:**
- `MCP server failed to start` - Check `.vscode/mcp.json` syntax
- `No MCP servers configured` - Create `.vscode/mcp.json` file
- `MCP tools not available in Copilot` - Enable Agent Mode in GitHub Copilot Chat
- `Permission denied` - Ensure server command/script has execute permissions

## Quick Commands Reference

```bash
# Development
npm install              # Install dependencies
npm run build           # Build TypeScript to JavaScript
npm run dev             # Development mode with hot reload
npm start               # Start production server

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # Check code style
npm run format          # Format code with Prettier

# Debugging
npm run build && node --inspect dist/index.js  # Debug built code
```

## Environment Variables Quick Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DIRECT_LINE_SECRET` | - | **Required** - Direct Line API secret |
| `MCP_TRANSPORT_MODE` | `stdio` | Transport: `stdio` or `http` |
| `LOG_LEVEL` | `info` | Logging: `debug`, `info`, `warn`, `error` |
| `NODE_ENV` | `development` | Environment mode |
| `HTTP_PORT` | `3000` | Port for HTTP mode |
| `TOKEN_REFRESH_INTERVAL` | `1800000` | Token refresh (30 min) |

## Next Steps

✅ **Development working?** See [Testing Guide](./SETUP_AND_DEPLOYMENT.md#testing)
✅ **Ready to deploy?** See [Deployment Options](./SETUP_AND_DEPLOYMENT.md#deployment-options)
✅ **Need OAuth?** See [Azure Entra ID Setup](./ENTRA_ID_SETUP.md)
✅ **Understanding errors?** See [Error Handling Guide](./ERROR_HANDLING.md)

## Support

- **Documentation**: [SETUP_AND_DEPLOYMENT.md](./SETUP_AND_DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues)
- **Full Setup**: [README.md](../README.md)
