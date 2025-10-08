# Azure Entra ID Setup Guide

This guide walks through setting up Azure Entra ID (formerly Azure Active Directory) authentication for the Copilot Studio Agent Direct Line MCP Server.

## Prerequisites

- Azure subscription with admin access
- Azure Entra ID tenant
- Bot Framework app registered in Azure
- Direct Line channel configured on your bot

## Overview

The MCP server supports two authentication modes:
1. **No Authentication** (stdio mode) - For local development
2. **OAuth 2.0 with Azure Entra ID** (HTTP mode) - For production deployments

## Step 1: Register Application in Azure Portal

### 1.1 Navigate to App Registrations

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Entra ID** (or **Azure Active Directory**)
3. Click **App registrations** in the left menu
4. Click **+ New registration**

### 1.2 Configure Application Registration

**Basic Information:**
- **Name**: `Copilot Studio MCP Server` (or your preferred name)
- **Supported account types**: Choose based on your needs:
  - `Accounts in this organizational directory only` - Single tenant (most common)
  - `Accounts in any organizational directory` - Multi-tenant
  - `Accounts in any organizational directory and personal Microsoft accounts` - Public
- **Redirect URI**:
  - Platform: `Web`
  - URI: `https://your-domain.com/auth/callback`
  - For local development: `http://localhost:3000/auth/callback`

Click **Register**.

### 1.3 Note Application Details

After registration, note these values from the **Overview** page:
- **Application (client) ID** - You'll use this as `ENTRA_CLIENT_ID`
- **Directory (tenant) ID** - You'll use this as `ENTRA_TENANT_ID`

## Step 2: Create Client Secret

### 2.1 Generate Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. **Description**: `MCP Server Production Secret`
4. **Expires**: Choose expiration (recommend 12-24 months for production)
5. Click **Add**

### 2.2 Save Secret Value

**IMPORTANT**: Copy the secret **Value** immediately - it won't be shown again!
- Use this as `ENTRA_CLIENT_SECRET` environment variable
- Store securely (Azure Key Vault, environment-specific secrets, etc.)

### 2.3 Secret Rotation Planning

Set a reminder to rotate secrets before expiration:
```bash
# Check secret expiration
az ad app credential list --id <APP_ID> --query "[].{EndDate:endDateTime}"
```

## Step 3: Configure API Permissions

### 3.1 Add Microsoft Graph Permissions

1. Go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
   - `User.Read` - Read user profile
   - `openid` - OpenID Connect sign-in
   - `profile` - View users' basic profile
   - `email` - View users' email address
   - `offline_access` - Maintain access to data (for refresh tokens)

### 3.2 Grant Admin Consent (if required)

If your tenant requires admin consent:
1. Click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm

## Step 4: Configure Authentication Settings

### 4.1 Platform Configuration

1. Go to **Authentication**
2. Under **Platform configurations**, click your web platform
3. Configure:
   - **Redirect URIs**: Ensure callback URL is listed
   - **Front-channel logout URL**: (optional) `https://your-domain.com/auth/logout`
   - **Implicit grant and hybrid flows**: Leave unchecked (using authorization code flow)

### 4.2 Supported Account Types

Verify the account type matches your requirements in **Authentication** > **Supported account types**.

### 4.3 Advanced Settings

Under **Authentication** > **Advanced settings**:
- **Allow public client flows**: `No`
- **Enable the following mobile and desktop flows**: Uncheck all

## Step 5: Configure Token Settings

### 5.1 Optional Claims

1. Go to **Token configuration**
2. Click **+ Add optional claim**
3. Select **ID**:
   - `email`
   - `preferred_username`
   - `name`

### 5.2 Token Lifetime

Default token lifetimes work for most scenarios:
- Access token: 1 hour
- Refresh token: 90 days (sliding window)

To customize, use Azure AD Conditional Access or Token Lifetime Policies.

## Step 6: Environment Configuration

### 6.1 Development Environment (.env.local)

```bash
# Environment
NODE_ENV=development

# Direct Line (Required)
DIRECT_LINE_SECRET=your-direct-line-secret

# Azure Entra ID OAuth (Required for HTTP mode)
ENTRA_TENANT_ID=your-tenant-id-here
ENTRA_CLIENT_ID=your-client-id-here
ENTRA_CLIENT_SECRET=your-client-secret-here
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ENTRA_SCOPES=openid,profile,email,offline_access

# Transport Mode
MCP_TRANSPORT_MODE=http  # or 'stdio' for local dev

# HTTP Server (when using HTTP mode)
HTTP_PORT=3000
SESSION_SECRET=generate-a-strong-random-secret-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
TRUST_PROXY=false
```

### 6.2 Production Environment

**Azure Container Apps Environment Variables:**

```bash
# Set via Azure Portal or Azure CLI
az containerapp update \
  --name copilot-mcp \
  --resource-group your-rg \
  --set-env-vars \
    "NODE_ENV=production" \
    "ENTRA_TENANT_ID=your-tenant-id" \
    "ENTRA_CLIENT_ID=your-client-id" \
    "MCP_TRANSPORT_MODE=http" \
    "HTTP_PORT=3000" \
    "TRUST_PROXY=true" \
    "ALLOWED_ORIGINS=https://your-domain.com"

# Set secrets separately
az containerapp secret set \
  --name copilot-mcp \
  --resource-group your-rg \
  --secrets \
    "direct-line-secret=your-secret" \
    "entra-client-secret=your-secret" \
    "session-secret=your-secret"
```

## Step 7: Test Authentication Flow

### 7.1 Local Testing

```bash
# Start server in HTTP mode
npm run dev

# Open browser and navigate to
http://localhost:3000/

# You'll see a beautiful login page with:
# - Gradient background design
# - "Sign in with Microsoft" button
# - Information about what you get with authentication

# Click "Sign in with Microsoft"
# Should redirect to Microsoft login page
# After successful auth, redirects to /auth/callback
# Then shows authenticated dashboard with:
# - Your session information
# - Available authenticated endpoints
# - Sign out option
```

### 7.2 Verify Token Exchange

Check server logs for:
```
[EntraID] OAuth client initialized
[EntraID] Token exchange successful
[SessionManager] Session created for user: user@domain.com
```

### 7.3 Test Error Scenarios

**Unauthenticated Access to Protected Endpoints:**
```bash
# Try accessing MCP stream without authentication
curl http://localhost:3000/mcp/stream

# Should return 401 with clear error:
{
  "error": "Authentication required",
  "message": "You must sign in to access this resource.",
  "loginUrl": "/auth/login",
  "code": "NO_SESSION"
}
```

**Invalid Credentials:**

```bash
# Should see user-friendly error
curl http://localhost:3000/auth/callback?error=access_denied
```

**Session Expiration:**

```bash
# Try accessing with expired session
# Should return 401 with:
{
  "error": "Session expired or invalid",
  "message": "Your session has expired. Please sign in again.",
  "loginUrl": "/auth/login",
  "code": "INVALID_SESSION"
}
```

**Token Refresh:**

```bash
# Wait for token expiration or force refresh
# Should see automatic token refresh in logs
[EntraID] Token refreshed successfully
```

## Step 8: Security Hardening

### 8.1 Enable Conditional Access (Recommended)

1. Go to Azure Entra ID > **Security** > **Conditional Access**
2. Create policy:
   - **Name**: MCP Server Access Control
   - **Users**: Select target users/groups
   - **Cloud apps**: Select your MCP app
   - **Conditions**:
     - Locations: Require trusted locations
     - Device platforms: (optional)
   - **Access controls**:
     - Grant: Require MFA (Multi-Factor Authentication)

### 8.2 Application Consent Policies

1. Go to Azure Entra ID > **Enterprise applications** > **Consent and permissions**
2. Configure:
   - User consent settings: Admin approval required
   - Group owner consent: Disabled
   - Risk-based step-up consent: Enabled

### 8.3 Monitoring and Alerts

Configure sign-in monitoring:
```bash
# Enable diagnostic settings
az monitor diagnostic-settings create \
  --name mcp-auth-logs \
  --resource /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app-name} \
  --logs '[{"category": "Authentication", "enabled": true}]' \
  --workspace {log-analytics-workspace-id}
```

## Step 9: Common Issues and Troubleshooting

### Issue 1: Redirect URI Mismatch

**Error**: `AADSTS50011: The reply URL specified in the request does not match`

**Solution**:

- Verify redirect URI in Azure Portal matches `ENTRA_REDIRECT_URI`
- Check for trailing slashes (be consistent)
- Ensure HTTPS in production

### Issue 2: Insufficient Permissions

**Error**: `AADSTS65001: The user or administrator has not consented`

**Solution**:

- Grant admin consent (Step 3.2)
- Or enable user consent in tenant settings

### Issue 3: Token Refresh Failures

**Error**: `invalid_grant: AADSTS700082: The refresh token has expired`

**Solution**:

- User must re-authenticate
- Check token lifetime policies
- Verify refresh token rotation settings

### Issue 4: CORS Errors in Browser

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:

```bash
# Add origin to ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://your-frontend.com,https://your-admin.com
```

## Step 10: Production Deployment Checklist

Before deploying to production:

- [ ] Client secret stored in Azure Key Vault or secrets manager
- [ ] Redirect URI uses HTTPS (not localhost)
- [ ] Conditional Access policies configured
- [ ] Admin consent granted for all required permissions
- [ ] Token expiration monitoring configured
- [ ] Secret rotation calendar set
- [ ] Audit logging enabled
- [ ] Backup authentication method configured
- [ ] Test user authentication end-to-end
- [ ] Verify token refresh workflow
- [ ] Test error scenarios
- [ ] Review security logs

## Advanced Configuration

### Multi-Tenant Applications

For multi-tenant scenarios:

```bash
ENTRA_TENANT_ID=common  # Accept any Azure AD tenant
# or
ENTRA_TENANT_ID=organizations  # Any organization tenant (not personal)
```

### Custom Scopes

To request custom API scopes:

```bash
ENTRA_SCOPES=openid,profile,email,api://your-api-id/custom.scope
```

### Certificate-Based Authentication

Instead of client secret, use certificate:

```typescript
// In src/services/entraid-client.ts
const msalConfig: Configuration = {
  auth: {
    clientId: config.clientId,
    authority: `https://login.microsoftonline.com/${config.tenantId}`,
    clientCertificate: {
      thumbprint: process.env.CERT_THUMBPRINT,
      privateKey: process.env.CERT_PRIVATE_KEY,
    },
  },
};
```

## References

- [Azure Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [OAuth 2.0 Authorization Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [MSAL for Node.js](https://learn.microsoft.com/en-us/entra/msal/node/)
- [Azure Container Apps Authentication](https://learn.microsoft.com/en-us/azure/container-apps/authentication)

## Support

For issues specific to:

- **Azure Entra ID**: [Azure Support](https://azure.microsoft.com/support/)
- **MCP Server**: [GitHub Issues](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues)
- **OAuth Flow**: Check `docs/ERROR_HANDLING.md` for OAuth error codes and recovery actions
