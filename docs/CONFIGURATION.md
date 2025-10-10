# 🔧 Configuration Guide

This guide covers all configuration options for the Copilot Studio Agent Direct Line MCP Server, including stdio and HTTP transport modes.

## Basic Configuration (Stdio Mode)

For local development with VS Code, minimal configuration is required.

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DIRECT_LINE_SECRET` | Direct Line secret key from Copilot Studio | `your_direct_line_secret_here` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level: `debug` \| `info` \| `warn` \| `error` |
| `NODE_ENV` | `development` | Environment: `development` \| `production` |
| `TOKEN_REFRESH_INTERVAL` | `1800000` | Token refresh interval in milliseconds (30 minutes) |
| `MCP_TRANSPORT_MODE` | `stdio` | Transport protocol: `stdio` \| `http` |

### Basic .env Example

```bash
# Required - Direct Line API Secret
DIRECT_LINE_SECRET=your_direct_line_secret_here

# Optional - Logging
LOG_LEVEL=info  # debug | info | warn | error
NODE_ENV=development

# Optional - Token refresh interval (milliseconds)
TOKEN_REFRESH_INTERVAL=1800000  # 30 minutes

# Optional - Transport mode
MCP_TRANSPORT_MODE=stdio  # stdio | http
```

## HTTP Mode Configuration

When deploying the MCP server in HTTP mode (for production or multi-user scenarios), additional configuration is required for Azure Entra ID OAuth authentication.

### Required Environment Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `MCP_TRANSPORT_MODE` | Transport protocol | `http` | Set to `http` to enable HTTP mode |
| `DIRECT_LINE_SECRET` | Direct Line secret key | `your-secret-key` | Required for Copilot Studio communication |
| `ENTRA_TENANT_ID` | Azure AD tenant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | GUID from Azure AD tenant |
| `ENTRA_CLIENT_ID` | App registration client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | From Azure app registration |
| `ENTRA_CLIENT_SECRET` | App registration secret | `your-client-secret` | Create in Azure app registration |
| `ENTRA_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/auth/callback` | Must match Azure app registration |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `3000` | HTTP server port |
| `ALLOWED_ORIGINS` | (none) | CORS allowed origins (comma-separated) |
| `ENTRA_SCOPES` | `openid,profile,email` | OAuth scopes requested |
| `SESSION_SECRET` | Auto-generated | Session encryption key (32+ characters) |
| `SESSION_TIMEOUT` | `86400000` | Session timeout (24 hours in milliseconds) |
| `LOG_LEVEL` | `info` | Logging level: `debug` \| `info` \| `warn` \| `error` |
| `NODE_ENV` | `development` | Environment: `development` \| `production` |
| `ENABLE_RATE_LIMITING` | `true` | Enable API rate limiting |
| `RATE_LIMIT_WINDOW` | `900000` | Rate limit window (15 minutes in milliseconds) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window per IP |

### Complete HTTP Mode .env Example

```bash
# Transport Configuration
MCP_TRANSPORT_MODE=http
NODE_ENV=production

# Direct Line (Required)
DIRECT_LINE_SECRET=your_direct_line_secret_from_copilot_studio

# Azure Entra ID OAuth (Required for HTTP mode)
ENTRA_TENANT_ID=12345678-1234-1234-1234-123456789abc
ENTRA_CLIENT_ID=87654321-4321-4321-4321-cba987654321
ENTRA_CLIENT_SECRET=your~client~secret~from~azure
ENTRA_REDIRECT_URI=https://your-domain.com/auth/callback
ENTRA_SCOPES=openid,profile,email

# HTTP Server
HTTP_PORT=3000
ALLOWED_ORIGINS=https://your-domain.com,https://vscode.dev

# Session Management
SESSION_SECRET=your-cryptographically-random-32-character-string
SESSION_TIMEOUT=86400000  # 24 hours

# Security
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000   # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Configuration for Different Environments

### Local Development (Stdio Mode)

```bash
# Minimal configuration for local development
DIRECT_LINE_SECRET=your_direct_line_secret_here
LOG_LEVEL=debug
NODE_ENV=development
```

### Local Development (HTTP Mode)

```bash
MCP_TRANSPORT_MODE=http
HTTP_PORT=3000
DIRECT_LINE_SECRET=your_direct_line_secret_here
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Staging Environment

```bash
MCP_TRANSPORT_MODE=http
HTTP_PORT=443
DIRECT_LINE_SECRET=your_direct_line_secret_here
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=https://staging-mcp.your-domain.com/auth/callback
ALLOWED_ORIGINS=https://staging-mcp.your-domain.com,https://vscode.dev
NODE_ENV=production
LOG_LEVEL=info
SESSION_TIMEOUT=43200000  # 12 hours for staging
```

### Production Environment

```bash
MCP_TRANSPORT_MODE=http
HTTP_PORT=443
DIRECT_LINE_SECRET=your_direct_line_secret_here
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=https://mcp.your-domain.com/auth/callback
ALLOWED_ORIGINS=https://mcp.your-domain.com,https://vscode.dev
NODE_ENV=production
LOG_LEVEL=warn
SESSION_TIMEOUT=86400000  # 24 hours
ENABLE_RATE_LIMITING=true
```

## Deployment Configuration Best Practices

### 1. Secrets Management

- ✅ Use Azure Key Vault or AWS Secrets Manager for sensitive values
- ✅ Never commit secrets to version control
- ✅ Rotate secrets regularly (quarterly recommended)
- ✅ Use separate secrets for each environment
- ✅ Use environment-specific Direct Line secrets

**Example with Azure Key Vault:**

```bash
# Reference secrets from Key Vault
DIRECT_LINE_SECRET=${KEY_VAULT_SECRET_DIRECT_LINE}
ENTRA_CLIENT_SECRET=${KEY_VAULT_SECRET_ENTRA_CLIENT}
SESSION_SECRET=${KEY_VAULT_SECRET_SESSION}
```

### 2. Session Configuration

- ✅ Let `SESSION_SECRET` auto-generate in development
- ✅ Use cryptographically random 32+ character strings in production
- ✅ Change session secret when deploying new instances
- ✅ Consider shorter timeouts for high-security scenarios
- ❌ Never use the same session secret across environments

**Generate Secure Session Secret:**

```bash
# Generate a secure session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. CORS Configuration

- ✅ Be specific with `ALLOWED_ORIGINS` - avoid wildcards (`*`)
- ✅ Include VS Code origins: `https://vscode.dev`, `https://insiders.vscode.dev`
- ✅ Add your application domain(s)
- ✅ Test CORS in staging before production deployment
- ❌ Never use `*` for ALLOWED_ORIGINS in production

**Example CORS Configuration:**

```bash
# Development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Production
ALLOWED_ORIGINS=https://mcp.your-domain.com,https://vscode.dev,https://insiders.vscode.dev
```

### 4. Rate Limiting

- ✅ Adjust based on expected load
- ✅ Monitor for legitimate users hitting limits
- ✅ Consider IP whitelisting for known clients
- ✅ Use lower limits for public-facing deployments

**Rate Limiting Profiles:**

```bash
# Low Traffic (Development/Testing)
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=50   # 50 requests per 15 min

# Medium Traffic (Small Team)
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per 15 min

# High Traffic (Production)
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=500  # 500 requests per 15 min
```

### 5. Logging

- ✅ Use `debug` for local development
- ✅ Use `info` for staging
- ✅ Use `warn` or `error` in production to reduce noise
- ✅ Integrate with monitoring tools (Application Insights, CloudWatch)

**Logging Levels:**

- **debug**: All logs including detailed debug information
- **info**: General informational messages
- **warn**: Warning messages and potential issues
- **error**: Error messages only

## VS Code mcp.json Configuration

### Stdio Transport (Local Development)

```json
{
  "inputs": [
    {
      "id": "direct_line_secret",
      "type": "promptString",
      "description": "Direct Line secret key from your Copilot Studio Agent"
    }
  ],
  "servers": {
    "copilot-studio-agent-direct-line-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### HTTP Transport (Remote Server)

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

## Configuration Validation

The server validates all configuration at startup using Zod schemas. Invalid configuration will cause the server to fail with descriptive error messages.

**Common Validation Errors:**

- `DIRECT_LINE_SECRET is required`: Provide your Direct Line secret
- `ENTRA_TENANT_ID must be a valid GUID`: Check your Azure tenant ID format
- `SESSION_SECRET must be at least 32 characters`: Generate a longer secret
- `HTTP_PORT must be a positive number`: Use a valid port number (1-65535)

## Environment-Specific Configuration Files

Create separate `.env` files for each environment:

```
.env.development      # Local development
.env.staging          # Staging environment
.env.production       # Production environment
.env.example          # Template (no secrets)
```

**Load environment-specific configuration:**

```bash
# Development
cp .env.development .env

# Staging
cp .env.staging .env

# Production
cp .env.production .env
```

## Next Steps

- **Getting Started**: See [Getting Started Guide](./GETTINGSTARTED.md) for installation
- **Azure Entra ID**: Review [Azure Entra ID Setup Guide](./ENTRA_ID_SETUP.md) for OAuth configuration
- **Deployment**: Check [Setup and Deployment Guide](./SETUP_AND_DEPLOYMENT.md) for production deployment
- **Troubleshooting**: Visit [Troubleshooting Guide](./TROUBLESHOOTING.md) for configuration issues
