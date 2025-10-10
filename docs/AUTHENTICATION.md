# Authentication Guide

Complete guide to authentication for the Copilot Studio Agent Direct Line MCP Server, covering both development and production scenarios.

## Table of Contents

- [Authentication Modes](#authentication-modes)
- [Stdio Mode (Local Development)](#stdio-mode-local-development)
- [HTTP Mode with Azure Entra ID OAuth](#http-mode-with-azure-entra-id-oauth)
- [Azure Entra ID Setup](#azure-entra-id-setup)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Authentication Modes

| Mode | Transport | Authentication | Use Case |
|------|-----------|----------------|----------|
| **Anonymous** | stdio | Direct Line Secret only | Local development, personal use |
| **OAuth 2.0** | HTTP | Azure Entra ID | Production deployments, enterprise |

## Stdio Mode (Local Development)

For local VS Code development, only the Direct Line secret is required—no user authentication needed.

### Configuration

Add to `.vscode/mcp.json`:

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
    "copilot-studio-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}"
      }
    }
  }
}
```

### Security Considerations

- ✅ Simple setup for personal use
- ⚠️ No user identification or isolation
- ❌ Not suitable for multi-user environments

## HTTP Mode with Azure Entra ID OAuth

For production deployments, HTTP mode requires full OAuth 2.0 authentication with Azure Entra ID.

### How It Works

1. User visits `/auth/login`
2. Redirected to Microsoft login page
3. After authentication, redirected to `/auth/callback`
4. Session created with user info and tokens
5. All MCP requests require valid session cookie

### OAuth Endpoints

- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - End user session
- `GET /auth/user` - Get current user info
- `GET /.well-known/oauth-authorization-server` - OAuth discovery

### Security Benefits

- ✅ Industry-standard authentication
- ✅ No credential storage in client
- ✅ Token refresh and expiration
- ✅ Full audit trail with user context
- ✅ Per-user conversation isolation
- ✅ Production-ready

## Azure Entra ID Setup

### Prerequisites

- Azure subscription with admin access
- Azure Entra ID tenant
- Direct Line channel enabled on your Copilot Studio Agent

### Step 1: Register Application in Azure Portal

#### 1.1 Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Entra ID** → **App registrations**
3. Click **+ New registration**
4. Configure:
   - **Name**: `Copilot Studio MCP Server`
   - **Supported account types**: `Accounts in this organizational directory only` (most common)
   - **Redirect URI**:
     - Platform: `Web`
     - Production: `https://your-domain.com/auth/callback`
     - Development: `http://localhost:3000/auth/callback`
5. Click **Register**

#### 1.2 Note Application Details

From the **Overview** page, copy:
- **Application (client) ID** → Use as `ENTRA_CLIENT_ID`
- **Directory (tenant) ID** → Use as `ENTRA_TENANT_ID`

### Step 2: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **+ New client secret**
3. Description: `MCP Server Production Secret`
4. Expires: 12-24 months (recommended for production)
5. Click **Add**
6. **IMPORTANT**: Copy the secret **Value** immediately → Use as `ENTRA_CLIENT_SECRET`

**Secret Rotation**: Set a calendar reminder to rotate before expiration.

### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `User.Read` - Read user profile
   - `openid` - OpenID Connect sign-in
   - `profile` - View users' basic profile
   - `email` - View users' email address
   - `offline_access` - Maintain access (for refresh tokens)
4. Click **Grant admin consent for [Your Organization]** (if required)

### Step 4: Configure Authentication Settings

1. Go to **Authentication**
2. Under **Platform configurations**, verify:
   - **Redirect URIs**: Callback URL is listed
   - **Front-channel logout URL**: (optional) `https://your-domain.com/auth/logout`
   - **Implicit grant and hybrid flows**: Leave unchecked
3. Under **Advanced settings**:
   - **Allow public client flows**: `No`

### Step 5: Environment Configuration

#### Development Environment

Create `.env.local`:

```bash
# Environment
NODE_ENV=development
LOG_LEVEL=debug

# Direct Line (Required)
DIRECT_LINE_SECRET=your-direct-line-secret

# Azure Entra ID OAuth (Required for HTTP mode)
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ENTRA_SCOPES=openid,profile,email,offline_access

# Transport Mode
MCP_TRANSPORT_MODE=http

# HTTP Server
HTTP_PORT=3000
SESSION_SECRET=auto-generated-if-not-provided
ALLOWED_ORIGINS=http://localhost:3000
```

#### Production Environment

```bash
NODE_ENV=production
LOG_LEVEL=info

# Direct Line (from Azure Key Vault)
DIRECT_LINE_SECRET=${KEY_VAULT_SECRET_DIRECT_LINE}

# Azure Entra ID OAuth
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=${KEY_VAULT_SECRET_ENTRA_CLIENT}
ENTRA_REDIRECT_URI=https://your-domain.com/auth/callback
ENTRA_SCOPES=openid,profile,email,offline_access

# Transport Mode
MCP_TRANSPORT_MODE=http

# HTTP Server
HTTP_PORT=443
SESSION_SECRET=${KEY_VAULT_SECRET_SESSION}
ALLOWED_ORIGINS=https://your-domain.com,https://vscode.dev
TRUST_PROXY=true
ENABLE_RATE_LIMITING=true
```

### Step 6: Test Authentication Flow

```bash
# Start server
npm run dev

# Navigate to http://localhost:3000
# Click "Sign in with Microsoft"
# Complete authentication
# Verify redirect to authenticated dashboard
```

**Verify in logs:**
```
[EntraID] OAuth client initialized
[EntraID] Token exchange successful
[SessionManager] Session created for user: user@domain.com
```

### Step 7: Security Hardening (Production)

#### Enable Conditional Access

1. Azure Entra ID → **Security** → **Conditional Access**
2. Create policy:
   - **Name**: MCP Server Access Control
   - **Cloud apps**: Select your MCP app
   - **Access controls**: Require MFA (Multi-Factor Authentication)

#### Configure Monitoring

```bash
az monitor diagnostic-settings create \
  --name mcp-auth-logs \
  --resource /subscriptions/{subscription}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app} \
  --logs '[{"category": "Authentication", "enabled": true}]' \
  --workspace {log-analytics-workspace-id}
```

### Production Deployment Checklist

- [ ] Client secret stored in Azure Key Vault
- [ ] Redirect URI uses HTTPS
- [ ] Conditional Access policies configured
- [ ] Admin consent granted
- [ ] Token expiration monitoring configured
- [ ] Secret rotation calendar set
- [ ] Audit logging enabled
- [ ] End-to-end auth tested
- [ ] Token refresh workflow verified
- [ ] Error scenarios tested

## Troubleshooting

### Redirect URI Mismatch

**Error**: `AADSTS50011: The reply URL specified in the request does not match`

**Solution**:
- Verify redirect URI in Azure Portal matches `ENTRA_REDIRECT_URI`
- Check for trailing slashes (be consistent)
- Ensure HTTPS in production

### Insufficient Permissions

**Error**: `AADSTS65001: The user or administrator has not consented`

**Solution**:
- Grant admin consent in Azure Portal
- Or enable user consent in tenant settings

### Token Refresh Failures

**Error**: `invalid_grant: AADSTS700082: The refresh token has expired`

**Solution**:
- User must re-authenticate
- Check token lifetime policies
- Verify refresh token rotation settings

### Authentication Required

**Error**: `401 Unauthorized - Authentication required`

**Solution**:
- Visit `/auth/login` to sign in
- Check session hasn't expired (default: 24 hours)
- Verify OAuth configuration is correct

### Session Expires Quickly

**Issue**: Need to re-authenticate frequently

**Solutions**:
- Increase `SESSION_TIMEOUT` (default: 86400000ms = 24 hours)
- Configure persistent sessions
- Check server isn't restarting
- Verify token refresh is working

## Best Practices

### Development

✅ **Do**:
- Use stdio mode for local development
- Use input prompts for secrets in `.vscode/mcp.json`
- Set `password: true` on secret inputs
- Test with short session timeouts first

❌ **Don't**:
- Hardcode secrets in configuration files
- Commit `.env` files to version control
- Use production secrets in development

### Production

✅ **Do**:
- Use HTTP mode with OAuth 2.0
- Store secrets in Azure Key Vault or secrets manager
- Use separate secrets per environment
- Rotate secrets regularly (quarterly recommended)
- Enable rate limiting and CORS protection
- Configure session timeouts appropriately
- Log authentication events for audit
- Enable MFA with Conditional Access

❌ **Don't**:
- Use anonymous mode in production
- Share authentication tokens between users
- Disable authentication
- Use weak session secrets
- Allow wildcards (`*`) in CORS origins

### Secret Management

```bash
# Generate secure session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check Azure Key Vault secrets
az keyvault secret list --vault-name your-vault

# Rotate secrets
az ad app credential reset --id <APP_ID>
```

## Advanced Configuration

### Multi-Tenant Applications

For multi-tenant scenarios:

```bash
ENTRA_TENANT_ID=common  # Any Azure AD tenant
# or
ENTRA_TENANT_ID=organizations  # Any organization tenant (not personal)
```

### Custom Scopes

Request custom API scopes:

```bash
ENTRA_SCOPES=openid,profile,email,api://your-api-id/custom.scope
```

## Next Steps

- **Configuration**: See [Configuration Guide](./CONFIGURATION.md) for all environment variables
- **Deployment**: Review [Setup and Deployment Guide](./SETUP_AND_DEPLOYMENT.md)
- **Troubleshooting**: Check [Troubleshooting Guide](./TROUBLESHOOTING.md) for common issues
- **Architecture**: Understanding [Architecture Documentation](./ARCHITECTURE.md)

## References

- [Azure Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [OAuth 2.0 Authorization Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [MSAL for Node.js](https://learn.microsoft.com/en-us/entra/msal/node/)
