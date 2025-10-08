# ⭐ Copilot Studio Agent Direct Line MCP Server

Easily install the Copilot Studio Agent Direct Line MCP Server for VS Code or VS Code Insiders:

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_Copilot_Studio_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio-agent-direct-line-mcp&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22copilot-studio-agent-direct-line-mcp%22%5D%2C%22env%22%3A%7B%22DIRECT_LINE_SECRET%22%3A%22%24%7Binput%3Adirect_line_secret%7D%22%7D%7D&inputs=%5B%7B%22id%22%3A%22direct_line_secret%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Direct%20Line%20secret%20key%20from%20your%20Copilot%20Studio%20Agent%22%7D%5D)
[![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Copilot_Studio_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio-agent-direct-line-mcp&quality=insiders&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22copilot-studio-agent-direct-line-mcp%22%5D%2C%22env%22%3A%7B%22DIRECT_LINE_SECRET%22%3A%22%24%7Binput%3Adirect_line_secret%7D%22%7D%7D&inputs=%5B%7B%22id%22%3A%22direct_line_secret%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Direct%20Line%20secret%20key%20from%20your%20Copilot%20Studio%20Agent%22%7D%5D)

This TypeScript project provides a **local** MCP server for Microsoft Copilot Studio Agents, enabling you to interact with your Copilot Studio Agents directly from your code editor via the Direct Line 3.0 API.

## 📄 Table of Contents

- [⭐ Copilot Studio Agent Direct Line MCP Server](#-copilot-studio-agent-direct-line-mcp-server)
  - [📄 Table of Contents](#-table-of-contents)
  - [📺 Overview](#-overview)
  - [🏆 Expectations](#-expectations)
  - [⚙️ Features](#️-features)
  - [🔐 Authentication Requirements](#-authentication-requirements)
  - [⚒️ Supported Tools](#️-supported-tools)
  - [🔌 Installation \& Getting Started](#-installation--getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
      - [✨ One-Click Install (Recommended)](#-one-click-install-recommended)
      - [🧨 Manual Install with NPX](#-manual-install-with-npx)
      - [🛠️ Install from Source (For Development)](#️-install-from-source-for-development)
  - [🔧 Configuration](#-configuration)
    - [Using NPX (Recommended)](#using-npx-recommended)
    - [Using Source Installation](#using-source-installation)
  - [🚀 Development](#-development)
  - [📖 Usage](#-usage)
    - [Using with VS Code](#using-with-vs-code)
    - [Standalone Server Usage](#standalone-server-usage)
    - [Using the Tools](#using-the-tools)
    - [MCP Tools Reference](#mcp-tools-reference)
  - [🏗️ Architecture](#️-architecture)
  - [🔑 Key Components](#-key-components)
  - [🛡️ Error Handling](#️-error-handling)
  - [🔒 Security](#-security)
  - [📝 Troubleshooting](#-troubleshooting)
  - [🧪 Testing](#-testing)
  - [🚢 Production Deployment](#-production-deployment)
  - [📚 Documentation](#-documentation)
  - [📌 Contributing](#-contributing)
  - [License](#license)
  - [💬 Support](#-support)

## 📺 Overview

The Copilot Studio Agent Direct Line MCP Server brings Microsoft Copilot Studio Agent context to your development environment. Try prompts like:

- "Start a conversation with my Copilot Studio Agent"
- "Ask my agent about product sizing"
- "Send a message to the agent: What are your capabilities?"
- "Get the conversation history"
- "End the current conversation"

## 🏆 Expectations

The Copilot Studio Agent Direct Line MCP Server is built with tools that are concise, simple, focused, and easy to use—each designed for a specific scenario. We intentionally avoid complex tools that try to do too much. The goal is to provide a thin abstraction layer over the Direct Line 3.0 API, making agent interaction straightforward and letting the language model handle complex reasoning.

## ⚙️ Features

- ✅ **Direct Line 3.0 Integration** - Full support for Microsoft Bot Framework Direct Line API
- ✅ **Token Management** - Automatic token caching and proactive refresh
- ✅ **Conversation State** - Manages conversation lifecycle with 30-minute idle timeout
- ✅ **MCP Tools** - Four tools for agent interaction: send_message, start_conversation, end_conversation, get_conversation_history
- ✅ **Comprehensive Error Handling** - 11 specialized error types, OAuth-specific retry strategies, MCP error transformation
- ✅ **Circuit Breaker Pattern** - Intelligent failure classification, excludes user errors from circuit state
- ✅ **Retry Logic** - Exponential backoff with jitter, OAuth-aware retry strategies
- ✅ **Input Validation** - Zod schemas for type-safe validation
- ✅ **Security** - Secret masking in logs, secure environment configuration, no disk persistence
- ✅ **HTTP Transport Mode** - Optional HTTP server with Azure Entra ID OAuth authentication
- ✅ **Testing Suite** - 45+ tests with 80%+ coverage on critical components
- ✅ **Production Ready** - Deployment templates for Azure Container Apps, Docker, Kubernetes

## 🔐 Authentication Requirements

The MCP server supports different authentication modes depending on the transport type:

### Stdio Mode (Local Development - No User Authentication)

> **Default for VS Code:** When using stdio transport (the default for VS Code), the MCP server uses only the **Direct Line Secret** to communicate with your Copilot Studio Agent. **No user sign-in is required.**
>
> - Users access the server directly through VS Code
> - All requests use the same Direct Line connection
> - Best for: Personal use, local development, testing
>
> In Copilot Studio, ensure your agent's **Security > Authentication** setting is set to **"No authentication"** for local development.

### HTTP Mode (Production - User Authentication Required)

> **Azure Entra ID OAuth:** When deploying via HTTP transport, **all users must sign in** through Azure Entra ID OAuth 2.0 before accessing the MCP server.
>
> - Users must visit `/auth/login` to authenticate
> - Each user has their own isolated session and conversations
> - Full audit trail with user identification
> - Best for: Production deployments, multi-user environments, enterprise applications
>
> **Authentication Flow:**
> 1. User navigates to `https://your-server/auth/login`
> 2. Redirected to Microsoft sign-in page
> 3. After authentication, redirected back to your app
> 4. Session cookie issued for authenticated access
> 5. All MCP tool calls require valid session
>
> For detailed setup and configuration, see:
> - **[Authentication Modes Guide](./docs/AUTHENTICATION_MODES.md)** - Complete authentication documentation
> - **[Azure Entra ID Setup Guide](./docs/ENTRA_ID_SETUP.md)** - OAuth configuration steps
> - **[Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md)** - Full deployment instructions

## ⚒️ Supported Tools

Interact with your Copilot Studio Agent using these tools:

- **send_message**: Send a message to the Copilot Studio Agent and receive a response.
- **start_conversation**: Start a new conversation with the Agent, optionally with an initial message.
- **end_conversation**: End a conversation and clean up resources.
- **get_conversation_history**: Retrieve message history for a conversation.

## 🔌 Installation & Getting Started

For the best experience, use Visual Studio Code and GitHub Copilot.

### Prerequisites

1. Install [VS Code](https://code.visualstudio.com/download) or [VS Code Insiders](https://code.visualstudio.com/insiders)
2. Install [Node.js](https://nodejs.org/en/download) 18+
3. Microsoft Copilot Studio Agent with Direct Line 3.0 enabled
4. Direct Line secret key from your Copilot Studio Agent

### Installation

#### ✨ One-Click Install (Recommended)

Click one of the badges below to automatically configure the MCP server in VS Code:

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_Copilot_Studio_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio-agent-direct-line-mcp&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22copilot-studio-agent-direct-line-mcp%22%5D%2C%22env%22%3A%7B%22DIRECT_LINE_SECRET%22%3A%22%24%7Binput%3Adirect_line_secret%7D%22%7D%7D&inputs=%5B%7B%22id%22%3A%22direct_line_secret%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Direct%20Line%20secret%20key%20from%20your%20Copilot%20Studio%20Agent%22%7D%5D)
[![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Copilot_Studio_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio-agent-direct-line-mcp&quality=insiders&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22copilot-studio-agent-direct-line-mcp%22%5D%2C%22env%22%3A%7B%22DIRECT_LINE_SECRET%22%3A%22%24%7Binput%3Adirect_line_secret%7D%22%7D%7D&inputs=%5B%7B%22id%22%3A%22direct_line_secret%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Direct%20Line%20secret%20key%20from%20your%20Copilot%20Studio%20Agent%22%7D%5D)

After clicking, VS Code will:
1. Prompt you for your Direct Line secret key
2. Automatically configure the MCP server
3. Start the server using `npx` (no manual installation needed!)

Then:
1. Select GitHub Copilot Agent Mode
2. Click "Select Tools" and choose the available Copilot Studio tools
3. Try a prompt like: `Start a conversation with my Copilot Studio Agent`

Learn more about Agent Mode in the [VS Code Documentation](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode).

#### 🧨 Manual Install with NPX

If you prefer manual configuration, add this to your `.vscode/mcp.json` file:

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
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}"
      }
    }
  }
}
```

Save the file and click 'Start' in the MCP Server panel. VS Code will prompt you for your Direct Line secret.

#### 🛠️ Install from Source (For Development)

For contributing or local development:

```bash
# Clone the repository
git clone https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp.git
cd copilot-studio-agent-direct-line-mcp

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and add your DIRECT_LINE_SECRET

# Build the project
npm run build

# Run in development mode (with hot reload)
npm run dev

# Or run the built version
npm start
```

For detailed setup instructions including environment configuration, testing, and deployment options, see the [Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md).

**VS Code Integration:** Add to `.vscode/mcp.json`:

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
      "command": "node",
      "args": ["/absolute/path/to/copilot-studio-agent-direct-line-mcp/dist/index.js"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/` with the actual path to the cloned repository.

**For detailed VS Code local development setup** including debugging, hot reload, and HTTP mode testing, see the [VS Code Local Development Setup](./docs/SETUP_AND_DEPLOYMENT.md#5-vs-code-local-development-setup) section in the Setup and Deployment Guide.

> 💥 **Pro Tip:** Create a `.github/copilot-instructions.md` file in your project with:
> ```
> This project uses Microsoft Copilot Studio Agents. Always check to see if the
> Copilot Studio MCP server has a tool relevant to the user's request.
> ```
> This will enhance your experience with GitHub Copilot Chat!

## 🔧 Configuration

### Using NPX (Recommended)

When using `npx`, configuration is handled through VS Code's MCP input prompts or environment variables:

- **DIRECT_LINE_SECRET** (required): Your Direct Line secret key from Copilot Studio
- **LOG_LEVEL** (optional): Logging level (default: `info`)
- **TOKEN_REFRESH_INTERVAL** (optional): Token refresh interval in milliseconds (default: `1800000` = 30 minutes)

The one-click install will automatically prompt you for the Direct Line secret. For manual configuration, you can add these to the `env` section of your `mcp.json` file.

### Using Source Installation

Create a `.env` file based on `.env.example`:

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

# Optional - HTTP mode configuration (only needed if MCP_TRANSPORT_MODE=http)
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ENTRA_SCOPES=openid,profile,email
HTTP_PORT=3000
SESSION_SECRET=generate-a-strong-random-secret
ALLOWED_ORIGINS=http://localhost:3000
```

For detailed environment configuration and setup instructions, see the [Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md).

## 🚀 Development

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Development mode with hot reload (using tsx)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Start production server
npm start
```

### Development Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **TypeScript**: 5.x (installed via npm)

### Project Structure

```text
src/
├── config/          # Environment configuration
├── server/          # MCP server implementation
├── services/        # Core services (DirectLine, Token, Conversation)
├── types/           # TypeScript definitions and error types
└── utils/           # Utilities (retry, circuit breaker, error transformer)

tests/               # Test suites
docs/                # Comprehensive documentation
```

See [Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md) for detailed development setup.

## 📖 Usage

### Using with VS Code

After installation, the MCP server runs automatically when you use GitHub Copilot. The server is invoked via `npx`, which automatically downloads and runs the latest version from NPM.

### Standalone Server Usage

You can run the server standalone for testing or integration with other MCP clients:

```bash
# Using npx (recommended)
DIRECT_LINE_SECRET=your_secret npx -y copilot-studio-agent-direct-line-mcp

# Or from source after building
node dist/index.js
```

The server uses stdio transport and will wait for MCP client connections.

### Using the Tools

You can now interact with your Copilot Studio Agent directly from GitHub Copilot:

```text
Start a conversation with my bot and ask about product sizing
```

GitHub Copilot will use the `start_conversation` and `send_message` tools to communicate with your Copilot Studio Agent.

### MCP Tools Reference

#### `send_message`

Send a message to the Copilot Studio Agent.

**Parameters:**

- `message` (string, required): The message text
- `conversationId` (string, optional): Conversation ID to continue existing conversation

**Returns:** JSON with conversationId, response, and activityId

#### `start_conversation`

Start a new conversation with the Agent.

**Parameters:**

- `initialMessage` (string, optional): First message to send

**Returns:** JSON with conversationId, status, and optional response

#### `end_conversation`

End a conversation and clean up resources.

**Parameters:**

- `conversationId` (string, required): Conversation ID to terminate

**Returns:** JSON with conversationId, status, and messageCount

#### `get_conversation_history`

Retrieve message history for a conversation.

**Parameters:**

- `conversationId` (string, required): Conversation ID
- `limit` (number, optional): Maximum number of messages to return

**Returns:** JSON with conversationId, messageCount, totalMessages, and messages array

## 🏗️ Architecture

```text
src/
├── config/          # Environment configuration with Zod validation
│   └── env.ts              # Environment variable validation
├── server/          # MCP server implementation
│   ├── mcp-server-enhanced.ts  # Enhanced MCP server with auth support
│   ├── tool-schemas.ts         # Zod validation schemas for tools
│   └── mcp-response.ts         # Response formatting & error handling
├── services/        # Core business logic
│   ├── directline-client.ts      # Direct Line API client with circuit breaker
│   ├── token-manager.ts          # Token caching & automatic refresh
│   ├── conversation-manager.ts   # Conversation lifecycle management
│   ├── http-client.ts            # Axios HTTP client with retry
│   ├── entraid-client.ts         # Azure Entra ID OAuth client
│   ├── session-manager.ts        # Session management for HTTP mode
│   ├── http-server.ts            # HTTP transport server (optional)
│   └── stores/                   # Session storage implementations
│       ├── memory-session-store.ts
│       └── file-session-store.ts
├── types/           # TypeScript type definitions
│   ├── errors.ts               # 11 specialized error classes
│   ├── session.ts              # Session management types
│   └── [other types]
└── utils/           # Utility functions
    ├── retry.ts                # Retry strategies with exponential backoff
    ├── circuit-breaker.ts      # Circuit breaker with failure classification
    ├── error-transformer.ts    # Error to MCP transformation
    └── secret-masking.ts       # Security utilities
```

### Transport Modes

- **Stdio Mode (Default)**: Standard MCP communication for local development
- **HTTP Mode**: RESTful API with OAuth authentication for production deployments

## 🔑 Key Components

### DirectLineClient

Handles all Direct Line API interactions with circuit breaker protection:

- Token generation
- Conversation creation
- Message sending
- Activity retrieval

### TokenManager

Manages Direct Line tokens with:

- In-memory caching (no disk persistence for security)
- Automatic refresh 5 minutes before expiry
- Metrics tracking

### ConversationManager

Tracks conversation state with:

- 30-minute idle timeout
- Watermark-based message tracking
- Message history buffering
- Automatic cleanup

### CircuitBreaker

Prevents cascading failures with intelligent failure classification:

- **3 States**: CLOSED, OPEN, HALF_OPEN
- **Failure Threshold**: 5 failures within 30 seconds opens circuit
- **Recovery Timeout**: 60 seconds before attempting recovery
- **Success Threshold**: 3 consecutive successes to close circuit
- **Failure Classification**: Excludes user errors (authentication, validation) from circuit state
- **Metrics**: Tracks success/failure rates and state transitions

## 🛡️ Error Handling

The server implements comprehensive, production-ready error handling:

### Error Type System

11 specialized error classes for precise error handling:

- **ApplicationError** - Base error with MCP transformation
- **NetworkError** - Network and connectivity issues
- **AuthenticationError** - Direct Line authentication failures
- **OAuthError** - Azure Entra ID OAuth errors with auto-retry classification
- **TokenRefreshError** - Token renewal failures
- **RateLimitError** - API rate limiting with retry-after support
- **ValidationError** - Input validation failures
- **ConversationError** - Conversation state issues
- **TimeoutError** - Request timeout errors
- **CircuitBreakerError** - Circuit breaker open state
- **UnexpectedError** - Unknown/unexpected errors

### Error Handling Features

1. **Retry Strategies**:
   - Exponential backoff with jitter (1s, 2s, 4s delays)
   - OAuth-specific retry logic (excludes invalid_grant errors)
   - Network error retry with configurable attempts
   - Max 3 retries for transient failures

2. **Circuit Breaker**:
   - Automatic fail-fast when service is degraded
   - Excludes user errors from failure count
   - Metrics-based state transitions
   - Graceful recovery with half-open state

3. **Error Classification**:
   - Categorizes by type (network, auth, rate limit, etc.)
   - Determines retry eligibility
   - Provides recovery actions
   - Severity levels (low, medium, high, critical)

4. **MCP Error Transformation**:
   - Converts internal errors to MCP-compliant format
   - Preserves error context and metadata
   - User-friendly error messages
   - Detailed logging for debugging

For detailed error handling documentation, see [Error Handling Guide](./docs/ERROR_HANDLING.md).

## 🔒 Security

### Local Development (Stdio Mode)
- **No Secret Logging**: Direct Line secret and tokens are never logged
- **Secret Masking**: Shows only first 4 and last 4 characters in logs
- **Environment Validation**: Zod schema validation for configuration
- **In-Memory Only**: No disk persistence of sensitive data

### Production Deployments (HTTP Mode)
- **OAuth 2.0 with Azure Entra ID**: Enterprise-grade authentication
- **PKCE Flow**: Protection against authorization code interception
- **Session Management**: Secure session storage with encryption
- **CORS Configuration**: Configurable allowed origins
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **CSRF Protection**: Cross-site request forgery prevention
- **Helmet Security Headers**: Comprehensive HTTP security headers

For security setup and best practices, see:
- [Azure Entra ID Setup Guide](./docs/ENTRA_ID_SETUP.md)
- [Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md)

## 📝 Troubleshooting

### MCP Server Not Connecting in VS Code

1. **Check the configuration path** - Ensure the absolute path to `dist/index.js` is correct
2. **Verify the build** - Run `npm run build` to ensure TypeScript compiled successfully
3. **Check logs** - Look at VS Code logs for error messages
4. **Test standalone** - Run `node dist/index.js` to verify the server starts without errors
5. **Restart VS Code** - After making config changes, fully quit and restart

### Direct Line Connection Issues

1. **Verify Secret** - Check that `DIRECT_LINE_SECRET` is correct in your configuration
2. **Check Bot Status** - Ensure your Copilot Studio Agent is published and Direct Line channel is enabled
3. **Review Logs** - Server logs will show connection attempts and errors

### Common Errors

#### Failed to generate Direct Line token

- Verify your `DIRECT_LINE_SECRET` is correct
- Check that the Direct Line channel is enabled in Azure Bot Service

#### Conversation not found or expired

- Conversations expire after 30 minutes of inactivity
- Start a new conversation with `start_conversation` tool

#### Circuit breaker is OPEN

- The server detected multiple failures and is protecting against cascading failures
- Wait 60 seconds for the circuit breaker to attempt recovery
- Check Direct Line API connectivity

### Example VS Code mcp.json Configuration

Here's a complete example configuration using npx (works on all platforms):

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
        "LOG_LEVEL": "info",
        "TOKEN_REFRESH_INTERVAL": "1800000"
      }
    }
  }
}
```

**Alternative: Hardcoded secret (not recommended for shared projects):**

```json
{
  "servers": {
    "copilot-studio-agent-direct-line-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "your_secret_here"
      }
    }
  }
}
```

## 🧪 Testing

### Testing the MCP Server (End Users)

The easiest way to test is through VS Code after installation:

1. Install using the one-click badge or manual npx configuration
2. Open GitHub Copilot Chat in Agent Mode
3. Try prompts like:
   - "Start a conversation with my Copilot Studio Agent"
   - "Send a message: Hello, what can you help me with?"
   - "Get the conversation history"

### Running Test Suites (Development)

The project includes comprehensive test coverage (45+ tests, 80%+ coverage):

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Test Coverage

- **Error Types**: 18 tests (97% coverage) - Error class hierarchy and MCP transformation
- **Circuit Breaker**: 13 tests (88% coverage) - State transitions and failure classification
- **Retry Logic**: 24 tests (78% coverage) - Exponential backoff and OAuth strategies
- **Overall**: 80%+ coverage on critical components

### Integration Testing (Development)

Test the MCP server integration:

```bash
# Set your Direct Line secret
export DIRECT_LINE_SECRET=your_secret_here

# Run MCP integration tests
npx tsx tests/test-mcp-client.ts
```

This tests all 4 MCP tools and verifies integration with your Copilot Studio Agent.

For detailed testing documentation, see [Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md).

## 🚢 Production Deployment

The MCP server is production-ready and includes deployment templates for multiple platforms:

### Azure Container Apps (Recommended)

Deploy to Azure Container Apps with built-in OAuth authentication:

```bash
# Build and push Docker image
docker build -t copilot-mcp:latest .
az acr login --name yourregistry
docker tag copilot-mcp:latest yourregistry.azurecr.io/copilot-mcp:latest
docker push yourregistry.azurecr.io/copilot-mcp:latest

# Deploy using Bicep template
az deployment group create \
  --resource-group copilot-mcp-rg \
  --template-file azure/container-apps/main-simple.bicep \
  --parameters containerAppName=copilot-mcp \
    directLineSecret=your-secret \
    azureClientId=your-client-id
```

### Other Deployment Options

- **Docker Compose**: For local multi-container setups
- **Azure App Service**: Traditional PaaS deployment
- **Kubernetes**: Enterprise-scale deployments with provided manifests

### Deployment Features

- ✅ **Zero-downtime deployments** with health checks
- ✅ **Automatic scaling** based on load
- ✅ **Secrets management** via Azure Key Vault
- ✅ **Monitoring and alerts** via Application Insights
- ✅ **HTTPS with custom domains**
- ✅ **OAuth 2.0 authentication** for production security

For complete deployment instructions, see:
- [Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md)
- [Azure Entra ID Setup Guide](./docs/ENTRA_ID_SETUP.md)

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md)** - Complete setup from local dev to production
- **[VS Code Development Quick Start](./docs/VSCODE_DEVELOPMENT.md)** - Quick reference for local MCP server development
- **[Error Handling Guide](./docs/ERROR_HANDLING.md)** - Error types, retry strategies, circuit breaker patterns
- **[Azure Entra ID Setup](./docs/ENTRA_ID_SETUP.md)** - OAuth configuration and authentication setup

## 📌 Contributing

We welcome contributions! Please file issues for bugs, enhancements, or documentation improvements.

### Development Setup

1. **Fork the repository**
2. **Clone and install**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/copilot-studio-agent-direct-line-mcp.git
   cd copilot-studio-agent-direct-line-mcp
   npm install
   ```
3. **Create environment file**:
   ```bash
   cp .env.example .env
   # Add your DIRECT_LINE_SECRET
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```
5. **Make your changes**
6. **Run tests and linting**:
   ```bash
   npm test
   npm run lint
   npm run format
   ```
7. **Build and verify**:
   ```bash
   npm run build
   npm run dev  # Test locally
   ```
8. **Commit and push**:
   ```bash
   git commit -am 'Add new feature'
   git push origin feature/my-feature
   ```
9. **Submit a pull request**

### Development Guidelines

- Maintain 80%+ test coverage for new code
- Follow TypeScript best practices
- Use the existing error type system
- Add tests for new features
- Update documentation as needed
- Follow the code style (ESLint + Prettier)

## License

Licensed under the [MIT License](./LICENSE).

## 💬 Support

For issues or questions, please open an issue on [GitHub](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues).

---

_This project is not affiliated with or endorsed by Microsoft Corporation._
