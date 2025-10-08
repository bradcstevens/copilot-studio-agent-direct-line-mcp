#!/bin/bash
# Deployment script for Azure Container Apps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
command -v az >/dev/null 2>&1 || { print_error "Azure CLI is required but not installed. Aborting."; exit 1; }
command -v docker >/dev/null 2>&1 || { print_error "Docker is required but not installed. Aborting."; exit 1; }

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-copilot-mcp-rg}"
LOCATION="${LOCATION:-eastus}"
ACR_NAME="${ACR_NAME:-}"
KEYVAULT_NAME="${KEYVAULT_NAME:-}"
REDIS_NAME="${REDIS_NAME:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Validate required environment variables
if [ -z "$ACR_NAME" ]; then
    print_error "ACR_NAME environment variable is required"
    exit 1
fi

if [ -z "$KEYVAULT_NAME" ]; then
    print_error "KEYVAULT_NAME environment variable is required"
    exit 1
fi

if [ -z "$REDIS_NAME" ]; then
    print_error "REDIS_NAME environment variable is required"
    exit 1
fi

print_info "Starting deployment to Azure Container Apps"
print_info "Resource Group: $RESOURCE_GROUP"
print_info "Location: $LOCATION"
print_info "ACR: $ACR_NAME"
print_info "Key Vault: $KEYVAULT_NAME"
print_info "Redis: $REDIS_NAME"

# Step 1: Login to Azure (if not already logged in)
print_info "Checking Azure login status..."
az account show >/dev/null 2>&1 || az login

# Step 2: Create resource group if it doesn't exist
print_info "Ensuring resource group exists..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# Step 3: Build and push Docker image
print_info "Building Docker image..."
docker build -t "${ACR_NAME}.azurecr.io/copilot-mcp:${IMAGE_TAG}" \
    --target runtime \
    -f ../../Dockerfile \
    ../..

print_info "Logging in to Azure Container Registry..."
az acr login --name "$ACR_NAME"

print_info "Pushing image to ACR..."
docker push "${ACR_NAME}.azurecr.io/copilot-mcp:${IMAGE_TAG}"

# Step 4: Deploy using Bicep
print_info "Deploying Container App using Bicep..."
az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file main.bicep \
    --parameters parameters.json \
    --parameters containerRegistryName="$ACR_NAME" \
    --parameters keyVaultName="$KEYVAULT_NAME" \
    --parameters redisCacheName="$REDIS_NAME" \
    --parameters imageTag="$IMAGE_TAG" \
    --output json > deployment-output.json

# Step 5: Get outputs
print_info "Deployment complete! Getting outputs..."
FQDN=$(jq -r '.properties.outputs.containerAppFqdn.value' deployment-output.json)
APP_ID=$(jq -r '.properties.outputs.containerAppId.value' deployment-output.json)

print_info "Container App FQDN: https://$FQDN"
print_info "Container App ID: $APP_ID"

# Step 6: Verify health
print_info "Waiting for container to be ready..."
sleep 30

print_info "Checking health endpoint..."
if curl -sf "https://$FQDN/health" > /dev/null; then
    print_info "Health check passed! ✓"
else
    print_warn "Health check failed or endpoint not ready yet"
fi

print_info "Deployment completed successfully!"
print_info ""
print_info "Next steps:"
print_info "1. Configure your OAuth redirect URI to: https://$FQDN/auth/callback"
print_info "2. Test the application at: https://$FQDN"
print_info "3. View logs: az containerapp logs show --name copilot-mcp --resource-group $RESOURCE_GROUP --follow"
