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
