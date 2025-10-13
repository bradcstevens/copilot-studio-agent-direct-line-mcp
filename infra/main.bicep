// =============================================================================
// Azure Container Apps Deployment for Copilot Studio MCP Server
// Azure Developer CLI (azd) Compatible
// =============================================================================

targetScope = 'resourceGroup'

// =============================================================================
// Parameters
// =============================================================================

@description('Name of the Container App')
param containerAppName string = 'copilot-mcp'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
@allowed([
  'development'
  'staging'
  'production'
])
param environment string = 'production'

@description('Container image tag')
param imageTag string = 'latest'

@description('Container registry name')
param containerRegistryName string

@description('Minimum number of replicas')
@minValue(0)
@maxValue(30)
param minReplicas int = 1

@description('Maximum number of replicas')
@minValue(1)
@maxValue(30)
param maxReplicas int = 10

@description('CPU cores per container')
param cpu string = '0.5'

@description('Memory per container')
param memory string = '1.0Gi'

@description('Enable ingress')
param enableIngress bool = true

@description('Target port for ingress')
param targetPort int = 3000

@description('Direct Line API Secret')
@secure()
param directLineSecret string

@description('Azure Client ID (Entra ID)')
param azureClientId string = ''

@description('Azure Client Secret (Entra ID)')
@secure()
param azureClientSecret string = ''

@description('Azure Tenant ID (Entra ID)')
param azureTenantId string = subscription().tenantId

@description('Session secret for HTTP mode')
@secure()
param sessionSecret string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  Application: 'Copilot-Studio-MCP-Server'
  ManagedBy: 'azd'
}

// =============================================================================
// Variables
// =============================================================================

var resourcePrefix = containerAppName
var containerAppEnvName = '${resourcePrefix}-env'
var logAnalyticsName = '${resourcePrefix}-logs'
var containerRegistryUrl = '${containerRegistryName}.azurecr.io'
var imageName = '${containerRegistryUrl}/${containerAppName}:${imageTag}'

// =============================================================================
// Existing Resources
// =============================================================================

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

// =============================================================================
// Log Analytics Workspace
// =============================================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// =============================================================================
// Container Apps Environment
// =============================================================================

resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// =============================================================================
// Managed Identity
// =============================================================================

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${resourcePrefix}-identity'
  location: location
  tags: tags
}

// Grant ACR pull access to managed identity
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, managedIdentity.id, 'AcrPull')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull role
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// =============================================================================
// Container App
// =============================================================================

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: enableIngress ? {
        external: true
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
          allowCredentials: true
        }
      } : null
      registries: [
        {
          server: containerRegistryUrl
          identity: managedIdentity.id
        }
      ]
      secrets: [
        {
          name: 'direct-line-secret'
          value: directLineSecret
        }
        {
          name: 'azure-client-secret'
          value: azureClientSecret
        }
        {
          name: 'session-secret'
          value: sessionSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: imageName
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: [
            {
              name: 'NODE_ENV'
              value: environment
            }
            {
              name: 'MCP_SERVER_PORT'
              value: string(targetPort)
            }
            {
              name: 'LOG_LEVEL'
              value: environment == 'production' ? 'info' : 'debug'
            }
            {
              name: 'DIRECT_LINE_SECRET'
              secretRef: 'direct-line-secret'
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: azureClientId
            }
            {
              name: 'AZURE_CLIENT_SECRET'
              secretRef: 'azure-client-secret'
            }
            {
              name: 'AZURE_TENANT_ID'
              value: azureTenantId
            }
            {
              name: 'SESSION_SECRET'
              secretRef: 'session-secret'
            }
            {
              name: 'OAUTH_SCOPES'
              value: 'openid profile email'
            }
            {
              name: 'MCP_TRANSPORT_MODE'
              value: 'http'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: targetPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 30
              periodSeconds: 10
              failureThreshold: 3
              timeoutSeconds: 5
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: targetPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 5
              failureThreshold: 3
              timeoutSeconds: 3
            }
            {
              type: 'Startup'
              httpGet: {
                path: '/health'
                port: targetPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 0
              periodSeconds: 5
              failureThreshold: 12
              timeoutSeconds: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
          {
            name: 'memory-scaling'
            custom: {
              type: 'memory'
              metadata: {
                type: 'Utilization'
                value: '80'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPullRole
  ]
}

// =============================================================================
// Outputs
// =============================================================================

@description('Container App FQDN')
output containerAppFqdn string = enableIngress ? containerApp.properties.configuration.ingress.fqdn : ''

@description('Container App Resource ID')
output containerAppId string = containerApp.id

@description('Container App Name')
output containerAppName string = containerApp.name

@description('Managed Identity Client ID')
output managedIdentityClientId string = managedIdentity.properties.clientId

@description('Managed Identity Principal ID')
output managedIdentityPrincipalId string = managedIdentity.properties.principalId

@description('Log Analytics Workspace ID')
output logAnalyticsWorkspaceId string = logAnalytics.id

@description('Service Endpoint URL')
output serviceUrl string = enableIngress ? 'https://${containerApp.properties.configuration.ingress.fqdn}' : ''

@description('Health Check URL')
output healthCheckUrl string = enableIngress ? 'https://${containerApp.properties.configuration.ingress.fqdn}/health' : ''
