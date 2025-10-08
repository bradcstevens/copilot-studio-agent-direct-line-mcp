# Setup and Deployment Guide

Complete guide for setting up the Copilot Studio Agent Direct Line MCP Server locally and deploying to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Deployment Options](#deployment-options)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: Latest version

Verify installations:

```bash
node --version  # Should be >= v18.0.0
npm --version   # Should be >= v8.0.0
git --version
```

### Required Azure Resources

1. **Azure Bot Service** with Direct Line channel configured
2. **Direct Line Secret** (obtain from Azure Portal)
3. (Optional) **Azure Entra ID App Registration** for OAuth authentication

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp.git
cd copilot-studio-agent-direct-line-mcp
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required dependencies including:
- `@modelcontextprotocol/sdk` - MCP server framework
- `@azure/msal-node` - Azure authentication
- `axios` - HTTP client
- `express` - HTTP server (for HTTP mode)
- Development tools (TypeScript, Jest, ESLint, Prettier)

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required - Direct Line API Secret
DIRECT_LINE_SECRET=your-direct-line-secret-here

# Optional - Logging
LOG_LEVEL=debug  # debug | info | warn | error
NODE_ENV=development

# Optional - Token refresh interval (milliseconds)
TOKEN_REFRESH_INTERVAL=1800000  # 30 minutes

# Optional - Transport mode
MCP_TRANSPORT_MODE=stdio  # stdio | http
```

**Get your Direct Line Secret:**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Bot Service
3. Go to **Channels** > **Direct Line**
4. Click **Show** next to the secret key
5. Copy the secret to your `.env` file

### 4. Verify Setup

Build the project to ensure everything is configured correctly:

```bash
npm run build
```

You should see TypeScript compilation complete successfully with no errors.

### 5. VS Code Local Development Setup

For developing the MCP server itself in VS Code, you'll need to configure VS Code to connect to your local development instance.

#### Option A: Using Built Files (Recommended for Testing)

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Create or edit `.vscode/mcp.json`** in your project:
   ```json
   {
     "servers": {
       "copilot-studio-agent-direct-line-mcp-local": {
         "type": "stdio",
         "command": "node",
         "args": ["dist/index.js"],
         "env": {
           "DIRECT_LINE_SECRET": "your-direct-line-secret-here",
           "LOG_LEVEL": "debug",
           "NODE_ENV": "development"
         }
       }
     }
   }
   ```

3. **Start the MCP server** in VS Code:
   - Open the MCP panel in VS Code
   - Your local server should appear as "copilot-studio-agent-direct-line-mcp-local"
   - Click "Start" to launch the server

4. **Rebuild after changes**:
   ```bash
   npm run build
   ```
   Then restart the MCP server in VS Code.

#### Option B: Using Development Mode (Hot Reload)

For continuous development with automatic reloading:

1. **Create a development wrapper script** `dev-wrapper.sh`:
   ```bash
   #!/bin/bash
   cd "$(dirname "$0")"
   npm run dev
   ```

2. **Make it executable**:
   ```bash
   chmod +x dev-wrapper.sh
   ```

3. **Update `.vscode/mcp.json`**:
   ```json
   {
     "servers": {
       "copilot-studio-agent-direct-line-mcp-dev": {
         "type": "stdio",
         "command": "/absolute/path/to/copilot-studio-agent-direct-line-mcp/dev-wrapper.sh",
         "env": {
           "DIRECT_LINE_SECRET": "your-direct-line-secret-here",
           "LOG_LEVEL": "debug",
           "NODE_ENV": "development"
         }
       }
     }
   }
   ```

4. **Start the development server**:
   - The server will automatically reload when you save changes
   - Monitor logs in the MCP panel

#### Option C: Using Environment File

To avoid hardcoding secrets in VS Code configuration:

1. **Ensure your `.env` file is configured** (already done in step 3):
   ```bash
   # .env
   DIRECT_LINE_SECRET=your-direct-line-secret-here
   LOG_LEVEL=debug
   NODE_ENV=development
   MCP_TRANSPORT_MODE=stdio
   ```

2. **Create `.vscode/mcp.json`** without secrets:
   ```json
   {
     "servers": {
       "copilot-studio-agent-direct-line-mcp-local": {
         "type": "stdio",
         "command": "node",
         "args": ["dist/index.js"]
       }
     }
   }
   ```

   The server will automatically load configuration from `.env`.

3. **Build and start**:
   ```bash
   npm run build
   ```
   Then start the server in VS Code's MCP panel.

#### Testing Your Local MCP Server in VS Code

Once your local server is running:

1. **Open GitHub Copilot Chat** in VS Code
2. **Enable Agent Mode** (click the agent icon)
3. **Select Tools** from your local MCP server
4. **Test with a prompt**:
   ```
   Start a conversation with my Copilot Studio Agent and ask about available features
   ```

5. **Monitor server logs**:
   - View logs in VS Code's MCP panel
   - Or run `npm run dev` in a terminal to see detailed logs

#### Debugging in VS Code

To debug the MCP server with breakpoints:

1. **Create `.vscode/launch.json`**:
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
         "runtimeArgs": [
           "--import",
           "tsx/esm"
         ],
         "env": {
           "DIRECT_LINE_SECRET": "your-direct-line-secret-here",
           "LOG_LEVEL": "debug",
           "NODE_ENV": "development",
           "MCP_TRANSPORT_MODE": "stdio"
         },
         "console": "integratedTerminal",
         "internalConsoleOptions": "neverOpen"
       }
     ]
   }
   ```

2. **Set breakpoints** in your TypeScript files
3. **Press F5** or click "Run and Debug" > "Debug MCP Server"
4. **Interact with the server** using stdio (type JSON-RPC messages)

#### HTTP Mode Development in VS Code

To test HTTP mode locally:

1. **Update `.env` for HTTP mode**:
   ```bash
   MCP_TRANSPORT_MODE=http
   HTTP_PORT=3000
   SESSION_SECRET=your-local-dev-secret-minimum-32-chars
   ALLOWED_ORIGINS=http://localhost:3000

   # Optional: Add Azure Entra ID credentials for OAuth testing
   ENTRA_TENANT_ID=your-tenant-id
   ENTRA_CLIENT_ID=your-client-id
   ENTRA_CLIENT_SECRET=your-client-secret
   ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Test the health endpoint**:
   ```bash
   curl http://localhost:3000/health
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": 1234567890
   }
   ```

4. **Switch back to stdio mode** when done:
   ```bash
   # In .env
   MCP_TRANSPORT_MODE=stdio
   ```

#### Common VS Code Development Issues

**Issue: MCP server not appearing in VS Code**
- Ensure `.vscode/mcp.json` is in the correct location
- Check file paths are absolute, not relative
- Restart VS Code after configuration changes

**Issue: Server starts but tools don't appear**
- Verify the server logs show "Server ready and listening"
- Check that `dist/index.js` exists (run `npm run build`)
- Ensure no TypeScript compilation errors

**Issue: Environment variables not loading**
- Verify `.env` file exists in project root
- Check `DIRECT_LINE_SECRET` is set correctly
- Review logs for "[Config] Environment loaded successfully"

## Configuration

### Environment Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DIRECT_LINE_SECRET` | Direct Line API secret from Azure | `abc123...` |

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment: `development`, `staging`, `production` |
| `LOG_LEVEL` | `info` | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `TOKEN_REFRESH_INTERVAL` | `1800000` | Token refresh interval in milliseconds (30 min) |
| `MCP_TRANSPORT_MODE` | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_SERVER_PORT` | auto | Port for MCP server (stdio mode uses stdin/stdout) |

#### HTTP Mode Variables (Optional)

Required only if `MCP_TRANSPORT_MODE=http`:

| Variable | Description | Example |
|----------|-------------|---------|
| `ENTRA_TENANT_ID` | Azure Entra ID tenant ID | `12345678-1234-...` |
| `ENTRA_CLIENT_ID` | Application (client) ID | `87654321-4321-...` |
| `ENTRA_CLIENT_SECRET` | Client secret value | `abc~DEF123...` |
| `ENTRA_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/auth/callback` |
| `ENTRA_SCOPES` | OAuth scopes (comma-separated) | `openid,profile,email` |
| `HTTP_PORT` | HTTP server port | `3000` |
| `SESSION_SECRET` | Session encryption secret | `strong-random-secret` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

### Transport Modes

#### STDIO Mode (Default)

- Used for local development with MCP clients
- Communicates over stdin/stdout
- No authentication required
- Best for: VS Code, local testing

```bash
MCP_TRANSPORT_MODE=stdio
```

#### HTTP Mode

- Used for production deployments
- RESTful API endpoints
- Supports OAuth authentication
- Best for: Web applications, remote clients

```bash
MCP_TRANSPORT_MODE=http
HTTP_PORT=3000
# OAuth configuration required
```

## Running Locally

### Development Mode (with hot reload)

```bash
npm run dev
```

This starts the server with automatic reloading when files change.

Output:
```
Starting Copilot Studio Agent Direct Line MCP Server...
[Config] Environment loaded successfully
[Config] Log level: debug
[Config] Transport mode: stdio
[DirectLine] Client initialized
[TokenManager] Token manager initialized
✅ Server ready and listening for MCP requests
```

### Production Build and Run

```bash
# Build
npm run build

# Start
npm start
```

### Verify Server is Running

**For stdio mode:**
The server will listen on stdin/stdout. You can test it with an MCP client.

**For HTTP mode:**
```bash
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-07T12:00:00.000Z",
  "uptime": 1234567,
  "version": "1.0.5"
}
```

## Testing

### Run All Tests

```bash
npm test
```

### Watch Mode (during development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

View coverage report at `coverage/lcov-report/index.html`

### Test MCP Integration

```bash
# Build first
npm run build

# Run MCP test client
npx ts-node tests/test-mcp-client.ts
```

This tests:
- ✅ MCP server connection
- ✅ Tool listing
- ✅ Conversation creation
- ✅ Message sending
- ✅ History retrieval
- ✅ Error handling

## Building for Production

### 1. Production Build

```bash
npm run build
```

This:
- Compiles TypeScript to JavaScript
- Generates source maps
- Creates type declarations
- Outputs to `dist/` directory

### 2. Verify Build

```bash
node dist/index.js
```

### 3. Build Optimization

The production build is optimized for:
- **Tree shaking** - Removes unused code
- **Type checking** - Validates all types
- **ES modules** - Modern JavaScript output
- **Source maps** - Debugging support

### Build Output

```
dist/
├── index.js              # Main entry point
├── index.d.ts           # Type declarations
├── config/              # Configuration modules
├── services/            # Service implementations
├── utils/               # Utility functions
└── types/               # Type definitions
```

## Deployment Options

### Option 1: Azure Container Apps (Recommended)

Azure Container Apps provides serverless container hosting with auto-scaling.

#### Prerequisites

- Azure CLI installed
- Docker installed
- Azure Container Registry (ACR)

#### Step 1: Build Docker Image

```bash
# Build
docker build -t copilot-mcp:latest .

# Test locally
docker run -p 3000:3000 \
  -e DIRECT_LINE_SECRET=your-secret \
  -e MCP_TRANSPORT_MODE=http \
  copilot-mcp:latest
```

#### Step 2: Push to Azure Container Registry

```bash
# Login to ACR
az acr login --name yourregistry

# Tag image
docker tag copilot-mcp:latest yourregistry.azurecr.io/copilot-mcp:latest

# Push
docker push yourregistry.azurecr.io/copilot-mcp:latest
```

#### Step 3: Deploy to Container Apps

```bash
# Create resource group
az group create --name copilot-mcp-rg --location eastus

# Deploy using Bicep template
az deployment group create \
  --resource-group copilot-mcp-rg \
  --template-file azure/container-apps/main-simple.bicep \
  --parameters \
    containerAppName=copilot-mcp \
    containerRegistryName=yourregistry \
    directLineSecret=your-direct-line-secret \
    sessionSecret=your-session-secret \
    azureClientId=your-client-id \
    azureClientSecret=your-client-secret \
    azureTenantId=your-tenant-id
```

#### Step 4: Verify Deployment

```bash
# Get app URL
az containerapp show \
  --name copilot-mcp \
  --resource-group copilot-mcp-rg \
  --query properties.configuration.ingress.fqdn

# Test health endpoint
curl https://your-app.azurecontainerapps.io/health
```

**Detailed guide:** See `azure/container-apps/README.md`

### Option 2: Docker Compose (Local/Development)

Perfect for local multi-container setups.

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Configuration:** Edit `docker-compose.yml`

### Option 3: Azure App Service

Traditional PaaS deployment option.

```bash
# Create App Service plan
az appservice plan create \
  --name copilot-mcp-plan \
  --resource-group copilot-mcp-rg \
  --sku B1 --is-linux

# Create web app
az webapp create \
  --resource-group copilot-mcp-rg \
  --plan copilot-mcp-plan \
  --name copilot-mcp-app \
  --deployment-container-image-name yourregistry.azurecr.io/copilot-mcp:latest

# Configure app settings
az webapp config appsettings set \
  --name copilot-mcp-app \
  --resource-group copilot-mcp-rg \
  --settings \
    DIRECT_LINE_SECRET=your-secret \
    MCP_TRANSPORT_MODE=http
```

### Option 4: Kubernetes

For enterprise-scale deployments.

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n copilot-mcp
kubectl get svc -n copilot-mcp

# View logs
kubectl logs -f deployment/copilot-mcp -n copilot-mcp
```

**Note:** Kubernetes manifests are available but Container Apps is recommended for simplicity.

## Monitoring and Maintenance

### Health Checks

The server provides a `/health` endpoint (HTTP mode):

```bash
curl http://your-server/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-07T12:00:00.000Z",
  "uptime": 3600000,
  "version": "1.0.5",
  "dependencies": [],
  "circuitBreakers": {
    "oauth": {
      "state": "CLOSED",
      "metrics": { "failures": 0, "successes": 42 }
    }
  }
}
```

### Logging

Configure logging level via `LOG_LEVEL`:

```bash
LOG_LEVEL=debug  # Detailed logs
LOG_LEVEL=info   # Standard logs (default)
LOG_LEVEL=warn   # Warnings only
LOG_LEVEL=error  # Errors only
```

Logs include:
- Server startup and shutdown
- Configuration loading
- Token refresh events
- Circuit breaker state changes
- Error details with stack traces

### Application Insights (Azure)

For production monitoring:

```bash
# Add Application Insights
npm install applicationinsights

# Configure in code
export APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

### Metrics to Monitor

1. **Health Status** - `/health` endpoint
2. **Response Times** - API latency
3. **Error Rates** - Failed requests
4. **Token Refresh** - OAuth token renewals
5. **Circuit Breaker** - Service degradation
6. **Memory Usage** - Container memory
7. **CPU Usage** - Container CPU

### Log Aggregation

**Azure Container Apps:**
```bash
# View logs
az containerapp logs show \
  --name copilot-mcp \
  --resource-group copilot-mcp-rg \
  --follow
```

**Docker:**
```bash
docker logs -f copilot-mcp
```

### Alerts

Configure alerts for:
- Health check failures
- High error rates (>5%)
- Circuit breaker open state
- Token refresh failures
- High memory usage (>80%)

## Troubleshooting

### Common Issues

#### 1. Server won't start

**Error:** `MODULE_NOT_FOUND`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### 2. Direct Line authentication fails

**Error:** `401 Unauthorized` from Direct Line API

**Solution:**
- Verify `DIRECT_LINE_SECRET` is correct
- Check secret hasn't expired in Azure Portal
- Ensure Direct Line channel is enabled

```bash
# Test secret
curl -H "Authorization: Bearer YOUR_SECRET" \
  https://directline.botframework.com/v3/directline/tokens/generate
```

#### 3. OAuth authentication fails

**Error:** `invalid_grant` or `AADSTS` errors

**Solution:**
- Verify Entra ID app registration
- Check redirect URI matches exactly
- Ensure client secret hasn't expired
- Grant admin consent if required

See: `docs/ENTRA_ID_SETUP.md`

#### 4. TypeScript compilation errors

**Error:** Type errors during build

**Solution:**
```bash
# Check TypeScript version
npx tsc --version  # Should be >= 5.0

# Clean build
rm -rf dist/
npm run build

# Check for type issues
npm run lint
```

#### 5. Port already in use

**Error:** `EADDRINUSE` when starting HTTP mode

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process or change port
HTTP_PORT=3001 npm run dev
```

#### 6. Circuit breaker open

**Error:** `Circuit breaker is OPEN - failing fast`

**Solution:**
- Check external service availability
- Review error logs for root cause
- Wait for recovery timeout (60 seconds default)
- Or manually reset:

```bash
# Restart server to reset circuit breakers
docker restart copilot-mcp
# or
kubectl rollout restart deployment/copilot-mcp
```

### Debug Mode

Enable detailed debugging:

```bash
# Set debug log level
LOG_LEVEL=debug npm run dev

# Enable Node.js debugging
NODE_OPTIONS='--inspect' npm run dev
```

Connect debugger:
- Chrome DevTools: `chrome://inspect`
- VS Code: Use launch configuration

### Getting Help

1. **Documentation**
   - `README.md` - Project overview
   - `docs/ERROR_HANDLING.md` - Error handling guide
   - `docs/ENTRA_ID_SETUP.md` - OAuth setup

2. **Logs**
   - Check application logs for errors
   - Review Azure diagnostics
   - Enable debug logging

3. **Support**
   - GitHub Issues: [Report a bug](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues)
   - Azure Support: For Azure-specific issues

### Useful Commands

```bash
# Check server status
curl http://localhost:3000/health

# View real-time logs
npm run dev 2>&1 | grep -i error

# Test build
npm run build && npm start

# Run specific test
npm test -- src/utils/__tests__/circuit-breaker.test.ts

# Format code
npm run format

# Lint code
npm run lint

# Clean install
rm -rf node_modules dist && npm install && npm run build
```

## Security Best Practices

### Development

- ✅ Never commit `.env` file
- ✅ Use strong secrets (min 32 characters)
- ✅ Rotate secrets regularly
- ✅ Enable OAuth in production
- ✅ Use HTTPS in production

### Production

- ✅ Store secrets in Azure Key Vault
- ✅ Enable Azure Managed Identity
- ✅ Configure CORS properly
- ✅ Enable rate limiting
- ✅ Use Azure Private Link (if needed)
- ✅ Enable Azure DDoS Protection
- ✅ Configure Web Application Firewall

### Checklist

Before deploying to production:

- [ ] All secrets in Key Vault
- [ ] OAuth configured and tested
- [ ] HTTPS enabled
- [ ] Health checks configured
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Backup strategy defined
- [ ] Incident response plan ready
- [ ] Tests passing (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation updated

## Next Steps

1. **Complete Setup**
   - Configure OAuth (see `docs/ENTRA_ID_SETUP.md`)
   - Set up monitoring
   - Configure alerts

2. **Deploy to Production**
   - Choose deployment option
   - Deploy using provided templates
   - Verify deployment

3. **Integrate with Applications**
   - Connect MCP clients
   - Configure authentication
   - Test end-to-end

4. **Maintain**
   - Monitor health metrics
   - Review logs regularly
   - Update dependencies
   - Rotate secrets

## Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Direct Line API Reference](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-direct-line-3-0-concepts)
- [Azure Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)

---

**Questions?** Open an issue on [GitHub](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues)
