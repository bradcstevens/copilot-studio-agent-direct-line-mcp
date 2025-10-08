# Azure Container Apps Deployment Guide

This directory contains Infrastructure as Code (IaC) for deploying the Copilot Studio Agent Direct Line MCP Server to Azure Container Apps.

## Overview

Azure Container Apps provides a serverless container platform that:
- Automatically scales based on HTTP traffic, CPU, and memory
- Manages TLS certificates automatically
- Provides built-in ingress and load balancing
- Integrates with Azure services (Key Vault, Redis, etc.)
- Supports managed identities for secure authentication

## Prerequisites

### Required Tools
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (v2.50+)
- [Docker](https://docs.docker.com/get-docker/)
- [jq](https://stedolan.github.io/jq/) (for parsing JSON in scripts)

### Required Azure Resources
- **Azure Container Registry (ACR)** - For storing container images
- **Azure Key Vault** - For managing secrets
- **Azure Cache for Redis** - For session storage
- **Azure Subscription** - With Contributor access

## Quick Start

### 1. Create Azure Resources

```bash
# Set variables
export RESOURCE_GROUP="copilot-mcp-rg"
export LOCATION="eastus"
export ACR_NAME="copilotmcpacr$(openssl rand -hex 4)"
export KEYVAULT_NAME="copilot-kv-$(openssl rand -hex 4)"
export REDIS_NAME="copilot-redis"

# Login to Azure
az login

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Standard \
  --admin-enabled false

# Create Key Vault
az keyvault create \
  --resource-group $RESOURCE_GROUP \
  --name $KEYVAULT_NAME \
  --location $LOCATION \
  --enable-rbac-authorization false

# Create Azure Cache for Redis
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port false \
  --minimum-tls-version 1.2
```

### 2. Store Secrets in Key Vault

```bash
# Store Direct Line secret
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "direct-line-secret" \
  --value "your-direct-line-secret"

# Store Azure AD client secret
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "azure-client-secret" \
  --value "your-azure-client-secret"

# Store session secret
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "session-secret" \
  --value "$(openssl rand -base64 32)"
```

### 3. Update Parameters

Edit `parameters.json` and update:
```json
{
  "containerRegistryName": { "value": "your-acr-name" },
  "keyVaultName": { "value": "your-keyvault-name" },
  "redisCacheName": { "value": "your-redis-name" }
}
```

### 4. Deploy

Using the deployment script:

```bash
# Export environment variables
export ACR_NAME="your-acr-name"
export KEYVAULT_NAME="your-keyvault-name"
export REDIS_NAME="your-redis-name"
export RESOURCE_GROUP="copilot-mcp-rg"
export LOCATION="eastus"

# Run deployment
./deploy.sh
```

Or manually with Azure CLI:

```bash
# Build and push image
docker build -t $ACR_NAME.azurecr.io/copilot-mcp:latest -f ../../Dockerfile ../..
az acr login --name $ACR_NAME
docker push $ACR_NAME.azurecr.io/copilot-mcp:latest

# Deploy with Bicep
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file main.bicep \
  --parameters @parameters.json \
  --parameters containerRegistryName=$ACR_NAME \
  --parameters keyVaultName=$KEYVAULT_NAME \
  --parameters redisCacheName=$REDIS_NAME
```

### 5. Verify Deployment

```bash
# Get Container App FQDN
FQDN=$(az containerapp show \
  --name copilot-mcp \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

# Test health endpoint
curl https://$FQDN/health

# View logs
az containerapp logs show \
  --name copilot-mcp \
  --resource-group $RESOURCE_GROUP \
  --follow
```

## Architecture

### Components

1. **Container App** - Runs the MCP server
2. **Managed Identity** - Authenticates to Azure services
3. **Log Analytics** - Collects logs and metrics
4. **Container Apps Environment** - Shared infrastructure
5. **Azure Key Vault** - Stores secrets
6. **Azure Cache for Redis** - Session storage
7. **Azure Container Registry** - Stores container images

### Security Features

- **Managed Identity** - No secrets in code or environment
- **Key Vault Integration** - Secrets fetched at runtime
- **TLS/HTTPS** - Automatic certificate management
- **Non-root Container** - Runs as UID 1001
- **Read-only Filesystem** - Enhanced security posture
- **Network Isolation** - Internal-only ingress option

### Scaling

- **HTTP Scaling** - Based on concurrent requests (100/replica)
- **CPU Scaling** - Triggers at 70% utilization
- **Memory Scaling** - Triggers at 80% utilization
- **Min/Max Replicas** - Configurable (default: 1-10)

## Configuration

### Environment Variables

All configuration is managed through:
1. **Bicep template** - For static configuration
2. **Key Vault secrets** - For sensitive data
3. **Parameters file** - For deployment-specific values

### Updating Configuration

To update non-secret configuration:

```bash
# Edit parameters.json or main.bicep
# Redeploy
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file main.bicep \
  --parameters @parameters.json
```

To update secrets:

```bash
# Update in Key Vault
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "secret-name" \
  --value "new-value"

# Restart container app to pick up changes
az containerapp revision restart \
  --name copilot-mcp \
  --resource-group $RESOURCE_GROUP
```

## Monitoring

### View Logs

```bash
# Stream live logs
az containerapp logs show \
  --name copilot-mcp \
  --resource-group $RESOURCE_GROUP \
  --follow

# View logs in Azure Portal
# Navigate to: Container App > Monitoring > Log stream
```

### Metrics

Access metrics in Azure Portal:
1. Navigate to Container App
2. Click "Metrics" under Monitoring
3. View CPU, Memory, HTTP requests, etc.

### Application Insights (Optional)

To enable Application Insights:

```bash
# Create Application Insights
az monitor app-insights component create \
  --app copilot-mcp-ai \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --workspace <log-analytics-workspace-id>

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app copilot-mcp-ai \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

# Add to container app environment variables
# Update main.bicep to include APPLICATIONINSIGHTS_CONNECTION_STRING
```

## Scaling

### Manual Scaling

```bash
# Scale to specific number of replicas
az containerapp update \
  --name copilot-mcp \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 3 \
  --max-replicas 15
```

### Auto-scaling Configuration

Edit `main.bicep` scale rules:

```bicep
scale: {
  minReplicas: 3
  maxReplicas: 20
  rules: [
    {
      name: 'http-scaling'
      http: {
        metadata: {
          concurrentRequests: '50'  // Scale when > 50 concurrent requests
        }
      }
    }
  ]
}
```

## Troubleshooting

### Container Not Starting

```bash
# Check revision status
az containerapp revision list \
  --name copilot-mcp \
  --resource-group $RESOURCE_GROUP \
  --output table

# View revision details
az containerapp revision show \
  --name <revision-name> \
  --resource-group $RESOURCE_GROUP
```

### Authentication Issues

```bash
# Verify managed identity has Key Vault access
az keyvault show \
  --name $KEYVAULT_NAME \
  --query properties.accessPolicies

# Test secret retrieval
az keyvault secret show \
  --vault-name $KEYVAULT_NAME \
  --name direct-line-secret
```

### Network Connectivity

```bash
# Test from console
az containerapp exec \
  --name copilot-mcp \
  --resource-group $RESOURCE_GROUP \
  --command /bin/sh

# Inside container:
# ping redis-host
# curl https://vault.azure.net
```

## Cost Optimization

### Development Environment

```json
{
  "minReplicas": 0,
  "maxReplicas": 1,
  "cpu": "0.25",
  "memory": "0.5Gi"
}
```

### Production Environment

```json
{
  "minReplicas": 3,
  "maxReplicas": 10,
  "cpu": "0.5",
  "memory": "1.0Gi"
}
```

### Cost Estimate

- **Container Apps**: ~$0.000024/vCPU-second + $0.000004/GiB-second
- **Redis Basic C0**: ~$16/month
- **Key Vault**: $0.03/10K operations
- **Log Analytics**: Pay-as-you-go ($2.30/GB)

## Cleanup

```bash
# Delete resource group (removes all resources)
az group delete --name $RESOURCE_GROUP --yes --no-wait

# Or delete individual resources
az containerapp delete --name copilot-mcp --resource-group $RESOURCE_GROUP
az acr delete --name $ACR_NAME --resource-group $RESOURCE_GROUP
az keyvault delete --name $KEYVAULT_NAME --resource-group $RESOURCE_GROUP
az redis delete --name $REDIS_NAME --resource-group $RESOURCE_GROUP
```

## Production Checklist

- [ ] Secrets stored in Key Vault
- [ ] Managed identity configured
- [ ] Redis TLS enabled
- [ ] Minimum 3 replicas for high availability
- [ ] Resource limits set appropriately
- [ ] Log Analytics retention configured
- [ ] Monitoring and alerts set up
- [ ] Backup strategy for Redis
- [ ] OAuth redirect URI configured
- [ ] Custom domain configured (optional)
- [ ] Rate limiting configured
- [ ] Disaster recovery plan documented

## Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Azure Cache for Redis Best Practices](https://docs.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices)
