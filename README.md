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
    - [Stdio Mode (Local Development - No User Authentication)](#stdio-mode-local-development---no-user-authentication)
    - [HTTP Mode (Production - User Authentication Required)](#http-mode-production---user-authentication-required)
    - [Direct Line Token Management](#direct-line-token-management)
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
    - [Development Prerequisites](#development-prerequisites)
    - [Project Structure](#project-structure)
    - [HTTP Mode Configuration Reference](#http-mode-configuration-reference)
      - [Required Environment Variables](#required-environment-variables)
      - [Optional Configuration](#optional-configuration)
      - [Complete HTTP Mode .env Example](#complete-http-mode-env-example)
      - [Configuration for Different Environments](#configuration-for-different-environments)
      - [Deployment Configuration Best Practices](#deployment-configuration-best-practices)
  - [📖 Usage](#-usage)
    - [Using with VS Code](#using-with-vs-code)
      - [Prerequisites](#prerequisites-1)
      - [How It Works](#how-it-works)
      - [Using the MCP Server](#using-the-mcp-server)
      - [HTTP Transport Mode with VS Code](#http-transport-mode-with-vs-code)
    - [Standalone Server Usage](#standalone-server-usage)
    - [Using the Tools](#using-the-tools)
    - [MCP Tools Reference](#mcp-tools-reference)
      - [Tool 1: `start_conversation`](#tool-1-start_conversation)
      - [Tool 2: `send_message`](#tool-2-send_message)
      - [Tool 3: `get_conversation_history`](#tool-3-get_conversation_history)
      - [Tool 4: `end_conversation`](#tool-4-end_conversation)
    - [Common Usage Patterns](#common-usage-patterns)
      - [Pattern 1: Simple Q\&A Flow](#pattern-1-simple-qa-flow)
      - [Pattern 2: Multi-Turn Conversation](#pattern-2-multi-turn-conversation)
      - [Pattern 3: Auto-Create Conversation (Quick Messages)](#pattern-3-auto-create-conversation-quick-messages)
      - [Pattern 4: Context Recovery](#pattern-4-context-recovery)
    - [Tool Comparison Matrix](#tool-comparison-matrix)
    - [Error Handling Best Practices](#error-handling-best-practices)
  - [🏗️ Architecture](#️-architecture)
    - [Transport Modes](#transport-modes)
      - [Stdio Transport (Default - Local Development)](#stdio-transport-default---local-development)
      - [HTTP Transport (Production Deployments)](#http-transport-production-deployments)
    - [HTTP Server Endpoints (HTTP Mode Only)](#http-server-endpoints-http-mode-only)
      - [OAuth \& Authentication Endpoints](#oauth--authentication-endpoints)
      - [OAuth Discovery Endpoints](#oauth-discovery-endpoints)
      - [MCP Communication Endpoint](#mcp-communication-endpoint)
      - [Utility Endpoints](#utility-endpoints)
      - [Authentication Flow Details](#authentication-flow-details)
      - [Error Responses](#error-responses)
      - [Rate Limiting](#rate-limiting)
      - [Security Headers](#security-headers)
  - [🔑 Key Components](#-key-components)
    - [DirectLineClient](#directlineclient)
    - [TokenManager](#tokenmanager)
    - [ConversationManager](#conversationmanager)
    - [CircuitBreaker](#circuitbreaker)
  - [🛡️ Error Handling](#️-error-handling)
    - [Error Type System](#error-type-system)
    - [Error Handling Features](#error-handling-features)
  - [🔒 Security](#-security)
    - [Local Development (Stdio Mode)](#local-development-stdio-mode)
    - [Production Deployments (HTTP Mode)](#production-deployments-http-mode)
    - [Credential Management Best Practices](#credential-management-best-practices)
  - [📝 Troubleshooting](#-troubleshooting)
    - [VS Code MCP Connection Issues](#vs-code-mcp-connection-issues)
      - [Server Not Showing Up in MCP Panel](#server-not-showing-up-in-mcp-panel)
      - [MCP Server Fails to Start](#mcp-server-fails-to-start)
      - [MCP Tools Not Appearing in GitHub Copilot](#mcp-tools-not-appearing-in-github-copilot)
      - [HTTP Transport Connection Issues](#http-transport-connection-issues)
      - [Debugging Tips](#debugging-tips)
    - [Direct Line Connection Issues](#direct-line-connection-issues)
    - [OAuth Authentication Issues (HTTP Mode)](#oauth-authentication-issues-http-mode)
      - [OAuth flow not initiating](#oauth-flow-not-initiating)
      - ["Invalid state parameter" error during callback](#invalid-state-parameter-error-during-callback)
      - ["Token refresh failed" or "Refresh token invalid"](#token-refresh-failed-or-refresh-token-invalid)
      - [Bearer token authentication fails in VS Code](#bearer-token-authentication-fails-in-vs-code)
    - [Common Errors](#common-errors)
      - [Failed to generate Direct Line token](#failed-to-generate-direct-line-token)
      - [Conversation not found or expired](#conversation-not-found-or-expired)
      - [Circuit breaker is OPEN](#circuit-breaker-is-open)
      - ["Authentication required" in HTTP mode](#authentication-required-in-http-mode)
    - [VS Code MCP Configuration Guide](#vs-code-mcp-configuration-guide)
      - [Configuration File Location](#configuration-file-location)
      - [Stdio Transport (Local Development)](#stdio-transport-local-development)
      - [HTTP Transport (Remote Server)](#http-transport-remote-server)
      - [Configuration Options](#configuration-options)
  - [🧪 Testing](#-testing)
    - [Testing the MCP Server (End Users)](#testing-the-mcp-server-end-users)
    - [Running Test Suites (Development)](#running-test-suites-development)
    - [Test Coverage](#test-coverage)
    - [Integration Testing (Development)](#integration-testing-development)
  - [🚢 Production Deployment](#-production-deployment)
    - [Azure Container Apps (Recommended)](#azure-container-apps-recommended)
    - [Other Deployment Options](#other-deployment-options)
    - [Deployment Features](#deployment-features)
    - [Deployment Scenario Examples](#deployment-scenario-examples)
      - [Scenario 1: Local Development (VS Code)](#scenario-1-local-development-vs-code)
      - [Scenario 2: Team Development Server (HTTP Mode)](#scenario-2-team-development-server-http-mode)
      - [Scenario 3: Production Multi-Tenant Deployment](#scenario-3-production-multi-tenant-deployment)
      - [Scenario 4: Hybrid Deployment (Local + Remote)](#scenario-4-hybrid-deployment-local--remote)
      - [Scenario 5: Docker Compose Local Stack](#scenario-5-docker-compose-local-stack)
    - [Deployment Comparison Matrix](#deployment-comparison-matrix)
  - [📚 Documentation](#-documentation)
  - [📌 Contributing](#-contributing)
    - [Development Setup](#development-setup)
    - [Development Guidelines](#development-guidelines)
  - [💬 Support](#-support)
  - [License](#license)

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
> 1. MCP client (e.g., VS Code) attempts to connect → receives 401 Unauthorized
> 2. Client discovers OAuth endpoints via `.well-known/oauth-authorization-server`
> 3. Client opens browser to `/authorize` with `redirect_uri` and `state` parameters
> 4. User is redirected to Microsoft sign-in page
> 5. After authentication, server redirects back to client's callback URL with authorization code
> 6. Client exchanges code for access token via `/auth/token`
> 7. All subsequent MCP requests include bearer token for authentication
>
> **VS Code Integration:**
> - Automatic OAuth discovery and flow initiation
> - Browser window opens for authentication
> - Window automatically closes after successful authentication
> - Bearer token authentication for all MCP tool calls
>
> **Session Management:**
> - `SESSION_SECRET` is auto-generated if not provided (recommended)
> - Sessions timeout after 24 hours of inactivity (configurable)
> - Multiple concurrent sessions supported per user

### Direct Line Token Management

Both stdio and HTTP modes use the same underlying Direct Line token system to communicate with Copilot Studio Agents:

> **Token Generation & Lifecycle:**
> 1. **DIRECT_LINE_SECRET**: Your secret key exchanges for time-limited Direct Line tokens
> 2. **Token Generation**: Server generates tokens automatically using the Direct Line 3.0 API
> 3. **In-Memory Caching**: Tokens are cached in memory (never persisted to disk for security)
> 4. **Automatic Refresh**: Tokens are proactively refreshed 5 minutes before expiration
> 5. **Token Expiration**: Direct Line tokens typically expire after 30 minutes
>
> **Security Features:**
> - Tokens are cached per conversation for optimal performance
> - Automatic retry logic with exponential backoff for transient failures
> - Circuit breaker pattern prevents cascading failures
> - All tokens and secrets are masked in logs (showing only first/last 4 characters)
> - No disk persistence - tokens exist only in memory during server runtime
>
> **Error Scenarios & Recovery:**
> - **Invalid Secret**: Verify `DIRECT_LINE_SECRET` is correct and Direct Line channel is enabled
> - **Token Expiration**: Tokens are automatically refreshed before expiry; no manual intervention needed
> - **Rate Limiting**: Automatic exponential backoff with jitter handles API rate limits
> - **Network Errors**: Built-in retry logic (max 3 attempts) for transient network issues
> - **Circuit Breaker Open**: After 5 consecutive failures, the circuit opens for 60 seconds to prevent cascading failures
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

# ========================================
# HTTP MODE CONFIGURATION
# Only needed if MCP_TRANSPORT_MODE=http
# ========================================

# Azure Entra ID OAuth Configuration (Required for HTTP mode)
ENTRA_TENANT_ID=your-tenant-id              # Azure AD tenant ID (GUID)
ENTRA_CLIENT_ID=your-client-id              # App registration client ID
ENTRA_CLIENT_SECRET=your-client-secret      # App registration client secret
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback  # OAuth callback URL
ENTRA_SCOPES=openid,profile,email           # OAuth scopes (comma-separated)

# HTTP Server Configuration
HTTP_PORT=3000                              # Port for HTTP server (default: 3000)
ALLOWED_ORIGINS=http://localhost:3000       # CORS allowed origins (comma-separated)

# Session Management
SESSION_SECRET=auto-generated-if-not-set    # Session encryption key (32+ chars)
SESSION_TIMEOUT=86400000                    # Session timeout in ms (default: 24 hours)

# Security Headers (optional - defaults provided)
ENABLE_RATE_LIMITING=true                   # Enable rate limiting (default: true)
RATE_LIMIT_WINDOW=900000                    # Rate limit window in ms (default: 15 min)
RATE_LIMIT_MAX_REQUESTS=100                 # Max requests per window (default: 100)
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

### HTTP Mode Configuration Reference

When deploying the MCP server in HTTP mode (for production or multi-user scenarios), additional configuration is required beyond the basic Direct Line secret.

#### Required Environment Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `MCP_TRANSPORT_MODE` | Transport protocol | `http` | Set to `http` to enable HTTP mode |
| `DIRECT_LINE_SECRET` | Direct Line secret key | `your-secret-key` | Required for Copilot Studio communication |
| `ENTRA_TENANT_ID` | Azure AD tenant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | GUID from Azure AD tenant |
| `ENTRA_CLIENT_ID` | App registration client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | From Azure app registration |
| `ENTRA_CLIENT_SECRET` | App registration secret | `your-client-secret` | Create in Azure app registration |
| `ENTRA_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/auth/callback` | Must match Azure app registration |

#### Optional Configuration

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

#### Complete HTTP Mode .env Example

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

#### Configuration for Different Environments

**Local Development:**
```bash
MCP_TRANSPORT_MODE=http
HTTP_PORT=3000
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

**Staging Environment:**
```bash
MCP_TRANSPORT_MODE=http
HTTP_PORT=443
ENTRA_REDIRECT_URI=https://staging-mcp.your-domain.com/auth/callback
ALLOWED_ORIGINS=https://staging-mcp.your-domain.com,https://vscode.dev
NODE_ENV=production
LOG_LEVEL=info
SESSION_TIMEOUT=43200000  # 12 hours for staging
```

**Production Environment:**
```bash
MCP_TRANSPORT_MODE=http
HTTP_PORT=443
ENTRA_REDIRECT_URI=https://mcp.your-domain.com/auth/callback
ALLOWED_ORIGINS=https://mcp.your-domain.com,https://vscode.dev
NODE_ENV=production
LOG_LEVEL=warn
SESSION_TIMEOUT=86400000  # 24 hours
ENABLE_RATE_LIMITING=true
```

#### Deployment Configuration Best Practices

1. **Secrets Management**:
   - Use Azure Key Vault or AWS Secrets Manager for sensitive values
   - Never commit secrets to version control
   - Rotate secrets regularly (quarterly recommended)
   - Use separate secrets for each environment

2. **Session Configuration**:
   - Let `SESSION_SECRET` auto-generate in development
   - Use cryptographically random 32+ character strings in production
   - Change session secret when deploying new instances
   - Consider shorter timeouts for high-security scenarios

3. **CORS Configuration**:
   - Be specific with `ALLOWED_ORIGINS` - avoid wildcards (`*`)
   - Include VS Code origins: `https://vscode.dev`, `https://insiders.vscode.dev`
   - Add your application domain(s)
   - Test CORS in staging before production deployment

4. **Rate Limiting**:
   - Adjust based on expected load
   - Monitor for legitimate users hitting limits
   - Consider IP whitelisting for known clients
   - Use lower limits for public-facing deployments

5. **Logging**:
   - Use `debug` for local development
   - Use `info` for staging
   - Use `warn` or `error` in production to reduce noise
   - Integrate with monitoring tools (Application Insights, CloudWatch)

## 📖 Usage

### Using with VS Code

The MCP server integrates seamlessly with VS Code through GitHub Copilot's MCP support.

#### Prerequisites

- **VS Code**: Version 1.96.0 or higher (December 2024 release or later)
- **GitHub Copilot Extension**: Required for MCP server integration
- **Node.js**: 18.x or higher installed on your system

#### How It Works

1. **Automatic Invocation**: When you use GitHub Copilot, VS Code automatically starts the MCP server via `npx`
2. **Stdio Transport**: Communication happens through standard input/output (no network required)
3. **Tool Discovery**: GitHub Copilot automatically discovers available MCP tools
4. **Agent Mode**: Use Agent Mode to explicitly select which MCP tools to include in your conversation

#### Using the MCP Server

**Method 1: Agent Mode (Recommended)**
1. Open GitHub Copilot Chat
2. Click "Select Tools" or use the Agent Mode picker
3. Choose the Copilot Studio MCP tools you want to use
4. Start chatting! Example: "Start a conversation with my Copilot Studio Agent"

**Method 2: Natural Language**
- GitHub Copilot automatically detects when to use MCP tools based on your prompts
- Example: "Ask my bot about pricing" → Copilot will use the MCP server automatically

Learn more about Agent Mode in the [VS Code Documentation](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode).

#### HTTP Transport Mode with VS Code

While stdio transport is recommended for local development, you can also connect VS Code to a remote MCP server running in HTTP mode:

**Setup for Remote HTTP Server:**

1. **Deploy HTTP Server**: See [Production Deployment](#-production-deployment) section
2. **Configure VS Code**: Add to `.vscode/mcp.json`:
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
3. **Authenticate**: VS Code will prompt you to sign in through your browser
4. **Use Tools**: Once authenticated, use MCP tools as normal

**Benefits of HTTP Mode:**
- ✅ Connect from multiple devices to the same server
- ✅ Share MCP server access across your team (with OAuth per-user isolation)
- ✅ Centralized session management and audit logs
- ✅ Production-grade security with Azure Entra ID

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

The MCP server provides 4 tools for interacting with Copilot Studio Agents. All tools use JSON-RPC 2.0 protocol and return structured responses.

#### Tool 1: `start_conversation`

Initiates a new conversation with the Copilot Studio Agent.

**When to Use:**
- Starting a fresh conversation session
- Resetting context from a previous conversation
- Beginning a new user interaction

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `initialMessage` | string | Optional | First message to send to the agent. If omitted, conversation starts without a message. |

**Returns:**

```typescript
{
  conversationId: string;      // Unique conversation identifier
  status: "started";           // Confirmation status
  response?: string;           // Agent's response (if initialMessage provided)
  watermark?: string;          // Message tracking watermark
}
```

**Example Usage:**

*Without initial message:*
```json
{
  "name": "start_conversation",
  "arguments": {}
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "status": "started"
}
```

*With initial message:*
```json
{
  "name": "start_conversation",
  "arguments": {
    "initialMessage": "Hello! I need help with product sizing."
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "status": "started",
  "response": "Hi! I'd be happy to help you with product sizing. What product are you interested in?"
}
```

**Error Conditions:**

- **Token Generation Failed**: Invalid `DIRECT_LINE_SECRET`
- **Rate Limit Exceeded**: Too many conversation starts
- **Circuit Breaker Open**: Service experiencing issues

**Best Practices:**
- Store the `conversationId` for subsequent messages
- Use `initialMessage` when you know the user's intent upfront
- Don't start multiple conversations for the same user session
- Handle conversation expiration (30 minutes of inactivity)

---

#### Tool 2: `send_message`

Sends a message to an active conversation with the Copilot Studio Agent.

**When to Use:**
- Continuing an existing conversation
- Sending user messages during a conversation flow
- Following up on previous agent responses

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Required | The message text to send to the agent |
| `conversationId` | string | Optional | Conversation ID from `start_conversation`. If omitted, a new conversation is created automatically. |

**Returns:**

```typescript
{
  conversationId: string;      // Conversation identifier
  response: string;            // Agent's response text
  activityId: string;          // Unique message activity ID
  watermark?: string;          // Message tracking watermark
}
```

**Example Usage:**

*With existing conversation:*
```json
{
  "name": "send_message",
  "arguments": {
    "message": "What's the price for size Medium?",
    "conversationId": "abc123xyz789"
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "response": "The price for size Medium is $49.99.",
  "activityId": "msg-456def"
}
```

*Without conversationId (auto-creates new conversation):*
```json
{
  "name": "send_message",
  "arguments": {
    "message": "Tell me about your return policy"
  }
}
```

Response:
```json
{
  "conversationId": "new-789ghi",
  "response": "Our return policy allows returns within 30 days...",
  "activityId": "msg-012jkl"
}
```

**Error Conditions:**

- **Conversation Not Found**: Invalid or expired `conversationId`
  - Solution: Start a new conversation with `start_conversation`
- **Message Too Long**: Message exceeds Direct Line limits (typically 65,536 characters)
  - Solution: Split message into smaller chunks
- **Conversation Expired**: No activity for 30 minutes
  - Solution: Start a new conversation
- **Empty Message**: Message parameter is empty or whitespace only
  - Solution: Provide valid message text

**Best Practices:**
- Always provide `conversationId` to maintain context
- Keep messages concise and focused
- Handle conversation expiration gracefully
- Store `activityId` for message tracking
- Don't send rapid-fire messages without waiting for responses

---

#### Tool 3: `get_conversation_history`

Retrieves message history for an active conversation.

**When to Use:**
- Reviewing conversation context
- Debugging conversation flow
- Implementing conversation summaries
- Recovering context after connection loss

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | Required | Conversation ID from which to retrieve history |
| `limit` | number | Optional | Maximum number of messages to return (default: all messages) |

**Returns:**

```typescript
{
  conversationId: string;      // Conversation identifier
  messageCount: number;        // Number of messages returned
  totalMessages: number;       // Total messages in conversation
  messages: Array<{            // Array of message objects
    id: string;                // Activity ID
    timestamp: string;         // ISO 8601 timestamp
    from: "user" | "bot";      // Message sender
    text: string;              // Message content
    type: string;              // Activity type
  }>;
}
```

**Example Usage:**

*Get all messages:*
```json
{
  "name": "get_conversation_history",
  "arguments": {
    "conversationId": "abc123xyz789"
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "messageCount": 4,
  "totalMessages": 4,
  "messages": [
    {
      "id": "msg-001",
      "timestamp": "2024-01-15T10:30:00Z",
      "from": "user",
      "text": "Hello! I need help with product sizing.",
      "type": "message"
    },
    {
      "id": "msg-002",
      "timestamp": "2024-01-15T10:30:01Z",
      "from": "bot",
      "text": "Hi! I'd be happy to help you with product sizing.",
      "type": "message"
    },
    {
      "id": "msg-003",
      "timestamp": "2024-01-15T10:30:15Z",
      "from": "user",
      "text": "What's the price for size Medium?",
      "type": "message"
    },
    {
      "id": "msg-004",
      "timestamp": "2024-01-15T10:30:16Z",
      "from": "bot",
      "text": "The price for size Medium is $49.99.",
      "type": "message"
    }
  ]
}
```

*Get last 2 messages:*
```json
{
  "name": "get_conversation_history",
  "arguments": {
    "conversationId": "abc123xyz789",
    "limit": 2
  }
}
```

Response (only last 2 messages):
```json
{
  "conversationId": "abc123xyz789",
  "messageCount": 2,
  "totalMessages": 4,
  "messages": [
    {
      "id": "msg-003",
      "timestamp": "2024-01-15T10:30:15Z",
      "from": "user",
      "text": "What's the price for size Medium?",
      "type": "message"
    },
    {
      "id": "msg-004",
      "timestamp": "2024-01-15T10:30:16Z",
      "from": "bot",
      "text": "The price for size Medium is $49.99.",
      "type": "message"
    }
  ]
}
```

**Error Conditions:**

- **Conversation Not Found**: Invalid `conversationId`
- **Conversation Expired**: History not available after expiration
- **Invalid Limit**: Negative or non-numeric limit value

**Best Practices:**
- Use `limit` for large conversations to reduce response size
- Cache history locally to minimize API calls
- Messages are ordered chronologically (oldest first)
- Not all activity types are messages (e.g., typing indicators)

---

#### Tool 4: `end_conversation`

Terminates an active conversation and releases server-side resources.

**When to Use:**
- User explicitly ends the conversation
- Conversation flow reaches a natural conclusion
- Cleaning up test conversations
- Resource management in high-volume scenarios

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | Required | Conversation ID to terminate |

**Returns:**

```typescript
{
  conversationId: string;      // Terminated conversation ID
  status: "ended";             // Confirmation status
  messageCount: number;        // Total messages exchanged
  duration?: number;           // Conversation duration in seconds
}
```

**Example Usage:**

```json
{
  "name": "end_conversation",
  "arguments": {
    "conversationId": "abc123xyz789"
  }
}
```

Response:
```json
{
  "conversationId": "abc123xyz789",
  "status": "ended",
  "messageCount": 8,
  "duration": 145
}
```

**Error Conditions:**

- **Conversation Not Found**: Already ended or invalid ID
  - Not critical - conversation is already inactive
- **Conversation Already Ended**: Idempotent operation
  - Returns success with 0 message count

**Best Practices:**
- Always end conversations when flow completes
- Not strictly required (30-minute auto-timeout)
- Improves resource utilization in production
- Safe to call multiple times (idempotent)
- Ending a conversation removes it from the server's active conversation cache

---

### Common Usage Patterns

#### Pattern 1: Simple Q&A Flow

```javascript
// 1. Start conversation with question
const start = await callTool("start_conversation", {
  initialMessage: "What are your business hours?"
});

// 2. Agent responds automatically in start response
console.log(start.response); // "We're open Monday-Friday, 9AM-5PM EST."

// 3. End conversation
await callTool("end_conversation", {
  conversationId: start.conversationId
});
```

#### Pattern 2: Multi-Turn Conversation

```javascript
// 1. Start without initial message
const conv = await callTool("start_conversation", {});

// 2. Send first message
const msg1 = await callTool("send_message", {
  message: "I need help with my order",
  conversationId: conv.conversationId
});

// 3. Continue conversation
const msg2 = await callTool("send_message", {
  message: "Order number: 12345",
  conversationId: conv.conversationId
});

// 4. Get full history
const history = await callTool("get_conversation_history", {
  conversationId: conv.conversationId
});

// 5. End when done
await callTool("end_conversation", {
  conversationId: conv.conversationId
});
```

#### Pattern 3: Auto-Create Conversation (Quick Messages)

```javascript
// Send message without starting conversation first
// MCP server automatically creates conversation
const response = await callTool("send_message", {
  message: "Quick question: Do you ship internationally?"
});

// Use returned conversationId for follow-ups
const followUp = await callTool("send_message", {
  message: "What countries do you ship to?",
  conversationId: response.conversationId
});
```

#### Pattern 4: Context Recovery

```javascript
// Conversation was interrupted, need to recover context
const history = await callTool("get_conversation_history", {
  conversationId: "abc123xyz789",
  limit: 5  // Get last 5 messages
});

// Review context, then continue
const nextMessage = await callTool("send_message", {
  message: "Continuing from before...",
  conversationId: "abc123xyz789"
});
```

### Tool Comparison Matrix

| Feature | start_conversation | send_message | get_conversation_history | end_conversation |
|---------|-------------------|--------------|-------------------------|------------------|
| **Creates Conversation** | ✅ Yes | ✅ If no conversationId | ❌ No | ❌ No |
| **Requires conversationId** | ❌ No | ⚠️ Optional | ✅ Yes | ✅ Yes |
| **Returns Agent Response** | ⚠️ If initialMessage | ✅ Always | ❌ No | ❌ No |
| **Modifies State** | ✅ Creates | ✅ Adds message | ❌ Read-only | ✅ Terminates |
| **Idempotent** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Can Fail After Timeout** | ❌ No | ✅ Yes | ✅ Yes | ⚠️ Soft fail |

### Error Handling Best Practices

**All Tools:**
- Always handle JSON parsing errors
- Check for `error` field in responses
- Implement exponential backoff for retries
- Log `conversationId` and `activityId` for debugging

**Conversation Expiration:**
```javascript
try {
  const response = await callTool("send_message", {
    message: "Hello",
    conversationId: oldConversationId
  });
} catch (error) {
  if (error.code === "ConversationError") {
    // Start new conversation
    const newConv = await callTool("start_conversation", {
      initialMessage: "Hello (recovering from expired conversation)"
    });
  }
}
```

**Circuit Breaker Handling:**
```javascript
try {
  const conv = await callTool("start_conversation", {});
} catch (error) {
  if (error.code === "CircuitBreakerError") {
    // Service is degraded, retry after 60 seconds
    await sleep(60000);
    return retry();
  }
}
```

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

The MCP server supports two transport modes, each optimized for different use cases:

#### Stdio Transport (Default - Local Development)

**Architecture:**
- Standard input/output communication (stdin/stdout)
- Process-to-process IPC (Inter-Process Communication)
- VS Code launches the MCP server as a child process via `npx`
- JSON-RPC 2.0 protocol over stdio streams

**Characteristics:**
- ✅ **Zero Network Overhead**: No HTTP, no sockets - direct process communication
- ✅ **Simple Configuration**: No ports, no firewall rules, no network security concerns
- ✅ **Automatic Process Management**: VS Code starts/stops the server automatically
- ✅ **No Authentication Required**: Process isolation provides security
- ✅ **Best Performance**: Sub-millisecond message passing
- ✅ **Ideal for**: Personal use, local development, testing, single-user scenarios

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                          VS Code (GitHub Copilot)                   │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  1. User: "Start a conversation with my bot"              │    │
│  │  2. Copilot detects MCP tool needed                        │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ JSON-RPC via stdio (IPC)
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    MCP Server (Child Process)                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  3. Parse JSON-RPC request                                 │    │
│  │  4. Validate parameters with Zod schemas                   │    │
│  │  5. Execute tool (e.g., start_conversation)                │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS + DIRECT_LINE_SECRET
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│              Direct Line 3.0 API (Microsoft)                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  6. Generate token, create conversation                    │    │
│  │  7. Route to Copilot Studio Agent                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Copilot Studio Agent                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  8. Process user message                                   │    │
│  │  9. Return response                                         │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓ (response flows back up)
                    10. Display to user in VS Code
```

**Message Flow Example:**
```
USER → "What's the weather?"
  ↓ [stdio]
MCP Server → start_conversation(initialMessage: "What's the weather?")
  ↓ [HTTPS]
Direct Line API → Generate token, create conversation, send message
  ↓
Copilot Studio Agent → Process question, generate response
  ↓
Direct Line API → Return: "The weather is sunny, 75°F"
  ↓ [HTTPS]
MCP Server → Format JSON-RPC response
  ↓ [stdio]
VS Code → Display: "The weather is sunny, 75°F"
```

#### HTTP Transport (Production Deployments)

**Architecture:**
- RESTful HTTP API with JSON-RPC over HTTP POST
- Express.js server with OAuth 2.0 authentication
- Azure Entra ID integration for enterprise identity
- Session-based authentication with bearer tokens
- Multi-user support with per-user conversation isolation

**Characteristics:**
- ✅ **Multi-User Support**: OAuth authentication for each user
- ✅ **Remote Access**: Connect from any device/location
- ✅ **Team Sharing**: Multiple users access the same MCP server instance
- ✅ **Enterprise Security**: Azure Entra ID, RBAC, audit logs
- ✅ **Production Ready**: Load balancing, scaling, monitoring
- ✅ **Centralized Management**: One server, many clients
- ✅ **Ideal for**: Production deployments, team environments, enterprise applications

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    VS Code (GitHub Copilot)                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  1. User: "Start a conversation with my bot"              │    │
│  │  2. Copilot sends JSON-RPC request                         │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS POST /mcp (no auth token)
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                 MCP Server (HTTP Mode - Express)                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  3. Check Authorization header → Not found!                │    │
│  │  4. Return 401 Unauthorized + OAuth discovery metadata     │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ 401 + OAuth endpoints
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          VS Code                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  5. Discover OAuth endpoints from response                 │    │
│  │  6. Open system browser to /authorize endpoint             │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Browser: GET /authorize?redirect_uri=...
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       MCP Server + Azure AD                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  7. Redirect to Azure Entra ID sign-in page               │    │
│  │  8. User signs in with Microsoft account                   │    │
│  │  9. Azure redirects back with authorization code           │    │
│  │ 10. Exchange code for access/refresh tokens (PKCE)         │    │
│  │ 11. Create session, generate bearer token                  │    │
│  │ 12. Redirect to VS Code callback with token                │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Callback with session token
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          VS Code                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 13. Store bearer token                                     │    │
│  │ 14. Retry original request with Authorization header       │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS POST /mcp
                             │ Authorization: Bearer <token>
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       MCP Server (HTTP Mode)                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 15. Validate bearer token                                  │    │
│  │ 16. Load user session                                       │    │
│  │ 17. Process JSON-RPC request                                │    │
│  │ 18. Execute tool with user-isolated context                │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS + DIRECT_LINE_SECRET
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Direct Line 3.0 API                              │
│                             ↓                                       │
│                    Copilot Studio Agent                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 19. Process message, generate response                     │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓ (response flows back up)
                    20. JSON-RPC response → VS Code
```

**OAuth Flow Detail:**
```
┌─────────┐  1. POST /mcp (no token)     ┌──────────────┐
│         │ ─────────────────────────────>│              │
│         │  2. 401 + OAuth metadata      │  MCP Server  │
│         │ <─────────────────────────────│  (Express)   │
│         │                               │              │
│         │  3. Open browser              └──────────────┘
│         │     /authorize?...                    │
│         │ ───────────────────┐                  │ 4. Redirect to
│ VS Code │                    ↓                  │    Azure AD
│         │              ┌──────────┐             ↓
│         │              │ Browser  │    ┌─────────────────┐
│         │              │          │───>│  Azure Entra ID │
│         │              └──────────┘    │   (Microsoft)   │
│         │                    ↑         └─────────────────┘
│         │                    │ 5. User signs in    │
│         │                    └─────────────────────┘
│         │                                          │
│         │  6. Callback with code            7. Exchange
│         │ <─────────────────────────────────┘  code for
│         │                                    tokens (PKCE)
│         │  8. Return session token                │
│         │ <───────────────────────────────────────┘
│         │
│         │  9. POST /mcp with Bearer token
│         │ ─────────────────────────────────>
└─────────┘                                   (Authenticated)
```

**Request/Response Pattern:**
```http
POST /mcp HTTP/1.1
Host: your-mcp-server.azurecontainerapps.io
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "send_message",
    "arguments": {
      "message": "Hello from HTTP!"
    }
  }
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "conversationId": "abc123",
    "response": "Hi there!",
    "activityId": "xyz789"
  }
}
```

**Performance Characteristics:**

| Aspect | Stdio Transport | HTTP Transport |
|--------|----------------|----------------|
| **Latency** | Sub-millisecond | 10-50ms (network + OAuth) |
| **Throughput** | Very High | High (limited by network) |
| **Connection** | Always connected | Stateless (reconnects per request) |
| **Authentication** | None (process isolation) | OAuth 2.0 per request |
| **Scalability** | Single user | Unlimited users |
| **Resource Usage** | Minimal | Moderate (session management) |
| **Network** | No network required | Requires stable internet |
| **Ideal For** | Local dev, testing | Production, teams |

**Connection Management:**

*Stdio Mode:*
- Single persistent connection for the VS Code session
- Automatic reconnection if process crashes
- No connection pooling needed

*HTTP Mode:*
- Stateless HTTP requests (no persistent connections)
- Session cookies manage user state
- Bearer token authentication on every request
- 24-hour session timeout (configurable)
- Automatic token refresh handled by VS Code

### HTTP Server Endpoints (HTTP Mode Only)

When running in HTTP transport mode, the server exposes these endpoints:

#### OAuth & Authentication Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/auth/login` | GET | Initiates OAuth flow, redirects to Azure sign-in | None |
| `/auth/callback` | GET | OAuth callback handler, exchanges code for tokens | Session |
| `/authorize` | GET | Standard OAuth authorization endpoint | None |
| `/auth/token` | POST | OAuth token exchange endpoint | None |
| `/auth/refresh` | POST | Refresh access token | Bearer/Session |
| `/auth/logout` | POST | Terminates session | Bearer/Session |
| `/auth/status` | GET | Check authentication status | Optional |
| `/auth/userinfo` | GET | Get authenticated user information | Bearer/Session |

#### OAuth Discovery Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/oauth-authorization-server` | GET | OAuth server metadata (RFC 8414) |
| `/.well-known/openid-configuration` | GET | OpenID Connect discovery |
| `/.well-known/oauth-protected-resource` | GET | Protected resource metadata |

#### MCP Communication Endpoint

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/mcp` | POST | JSON-RPC 2.0 over HTTP for MCP protocol | Bearer Token |

**Example `/mcp` Request:**
```json
POST /mcp
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "start_conversation",
    "arguments": {
      "initialMessage": "Hello!"
    }
  }
}
```

**Example Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "conversationId": "abc123xyz",
    "status": "started",
    "response": "Hi! How can I help you today?"
  }
}
```

#### Utility Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Health check endpoint | None |
| `/` | GET | Login page or dashboard | Optional |

#### Authentication Flow Details

**1. OAuth Authorization Code Flow with PKCE:**
```
Client → GET /auth/login?redirect_uri=...&state=...
  ↓
Server → Generates PKCE code challenge
  ↓
Server → Redirects to Azure Entra ID sign-in
  ↓
User → Authenticates with Microsoft
  ↓
Azure → Redirects to /auth/callback?code=...&state=...
  ↓
Server → Validates state, exchanges code for tokens
  ↓
Server → Creates session, returns bearer token
  ↓
Client → Uses bearer token for /mcp requests
```

**2. Bearer Token Authentication:**
```http
POST /mcp
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  ...
}
```

**3. Session Management:**
- Sessions stored server-side (in-memory or persistent store)
- Each session contains: user context, token metadata, security tracking
- Session ID linked to bearer token for validation
- Automatic cleanup of expired sessions
- Support for concurrent sessions per user

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Authentication required",
  "message": "You must sign in to access this resource.",
  "loginUrl": "/auth/login",
  "code": "NO_SESSION"
}
```

**403 Forbidden:**
```json
{
  "error": "Session expired or invalid",
  "message": "Your session has expired. Please sign in again.",
  "loginUrl": "/auth/login",
  "code": "INVALID_SESSION"
}
```

**500 Internal Server Error:**
```json
{
  "error": "MCP message failed",
  "message": "An error occurred processing your request"
}
```

#### Rate Limiting

All `/auth/*` endpoints are rate-limited:
- **Limit**: 100 requests per 15 minutes per IP address
- **Response**: `429 Too Many Requests` when exceeded
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

#### Security Headers

All responses include comprehensive security headers via Helmet:
- `Content-Security-Policy`: Restricts resource loading
- `Strict-Transport-Security`: Forces HTTPS (production)
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Legacy XSS protection

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
- **Process Isolation**: Each MCP server runs in its own isolated process
- **No Network Exposure**: Stdio mode uses local IPC, no network ports opened

### Production Deployments (HTTP Mode)
- **OAuth 2.0 with Azure Entra ID**: Enterprise-grade authentication
- **PKCE Flow**: Protection against authorization code interception
- **Session Management**: Secure session storage with encryption
- **CORS Configuration**: Configurable allowed origins
- **Rate Limiting**: Built-in rate limiting for API endpoints (100 requests/15 min per IP)
- **CSRF Protection**: Cross-site request forgery prevention with state parameter validation
- **Helmet Security Headers**: Comprehensive HTTP security headers (CSP, HSTS, X-Frame-Options)
- **Token Security**:
  - Access tokens expire after configured Azure AD lifetime (typically 1 hour)
  - Refresh tokens stored securely in session storage
  - Bearer tokens transmitted only over HTTPS in production
  - Automatic token rotation on refresh

### Credential Management Best Practices

**DIRECT_LINE_SECRET Protection:**
- ✅ **DO**: Store in environment variables or secure secret management (Azure Key Vault, AWS Secrets Manager)
- ✅ **DO**: Use VS Code input prompts for local development (avoids committing to git)
- ✅ **DO**: Rotate secrets regularly and update immediately if compromised
- ✅ **DO**: Use separate secrets for development, staging, and production environments
- ❌ **DON'T**: Hardcode secrets in configuration files
- ❌ **DON'T**: Commit secrets to version control (add `.env` to `.gitignore`)
- ❌ **DON'T**: Share secrets in chat, email, or unencrypted channels
- ❌ **DON'T**: Log or display full secret values

**OAuth Client Secret Protection (HTTP Mode):**
- ✅ **DO**: Store `ENTRA_CLIENT_SECRET` in secure secret management
- ✅ **DO**: Use Azure Managed Identity when deploying to Azure (eliminates need for client secrets)
- ✅ **DO**: Rotate client secrets before expiration (Azure notifies 60 days in advance)
- ✅ **DO**: Use separate client registrations per environment
- ❌ **DON'T**: Share client secrets across multiple applications
- ❌ **DON'T**: Use the same client secret for development and production

**Session Secret Best Practices:**
- ✅ **DO**: Let the server auto-generate `SESSION_SECRET` if not provided
- ✅ **DO**: Use a cryptographically random string (at least 32 characters)
- ✅ **DO**: Change session secret when deploying new instances
- ❌ **DON'T**: Use predictable values like "secret" or "password"

For security setup and best practices, see:
- [Azure Entra ID Setup Guide](./docs/ENTRA_ID_SETUP.md)
- [Setup and Deployment Guide](./docs/SETUP_AND_DEPLOYMENT.md)

## 📝 Troubleshooting

### VS Code MCP Connection Issues

#### Server Not Showing Up in MCP Panel

1. **Verify VS Code Version**: Ensure you're running VS Code 1.96.0 or later
   ```bash
   code --version
   ```
2. **Check mcp.json Location**: File must be at `.vscode/mcp.json` in workspace root
3. **Validate JSON Syntax**: Use a JSON validator to check for syntax errors
4. **Check GitHub Copilot**: Ensure GitHub Copilot extension is installed and activated
5. **Restart VS Code**: Quit completely (not just reload window) and restart

#### MCP Server Fails to Start

**Symptom**: Server shows error status in MCP panel

**Common Causes & Solutions:**

1. **Node.js Not Found**
   - Error: `command not found: node` or `command not found: npx`
   - Solution: Install Node.js 18+ and ensure it's in your PATH
   - Test: Run `node --version` in terminal

2. **Invalid DIRECT_LINE_SECRET**
   - Error: `Failed to generate Direct Line token`
   - Solution: Verify secret in Copilot Studio → Channels → Direct Line
   - Check: Secret must start with your channel identifier

3. **NPX Package Not Found**
   - Error: `package not found: copilot-studio-agent-direct-line-mcp`
   - Solution: Check internet connection, npm registry accessibility
   - Alternative: Use local source installation

4. **Path Issues (Source Installation)**
   - Error: `Cannot find module`
   - Solution: Use absolute path in mcp.json, verify dist/index.js exists
   - Build first: `npm run build`

#### MCP Tools Not Appearing in GitHub Copilot

1. **Select Tools Manually**: In Copilot Chat, click "Select Tools" and enable MCP tools
2. **Check Server Status**: Look for green indicator in MCP Server panel
3. **Restart MCP Server**: Click "Restart" in MCP panel
4. **Check Logs**: View Output → Model Context Protocol for errors

#### HTTP Transport Connection Issues

**Authentication Loop:**
- Symptom: Repeatedly redirected to login page
- Solution:
  - Clear cookies/cache for the server URL
  - Check `SESSION_SECRET` is consistent
  - Verify redirect URI in Azure Entra ID matches server configuration

**CORS Errors:**
- Symptom: `Access-Control-Allow-Origin` errors in browser console
- Solution: Add VS Code origin to `ALLOWED_ORIGINS` environment variable
  ```bash
  ALLOWED_ORIGINS=http://localhost:3000,vscode://vscode
  ```

**OAuth Discovery Failed:**
- Symptom: VS Code can't find OAuth endpoints
- Solution: Verify server is running and accessible
- Test: Open `https://your-server/.well-known/oauth-authorization-server` in browser
- Should return JSON with authorization/token endpoints

#### Debugging Tips

**Enable Verbose Logging:**
```json
{
  "servers": {
    "copilot-studio": {
      "env": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      }
    }
  }
}
```

**View MCP Server Logs:**
1. Open VS Code Output panel (View → Output)
2. Select "Model Context Protocol" from dropdown
3. Look for connection attempts and errors

**Test Server Standalone:**
```bash
# Stdio mode
DIRECT_LINE_SECRET=your_secret node dist/index.js

# HTTP mode
MCP_TRANSPORT_MODE=http HTTP_PORT=3000 \
DIRECT_LINE_SECRET=your_secret \
ENTRA_TENANT_ID=your_tenant \
ENTRA_CLIENT_ID=your_client \
ENTRA_CLIENT_SECRET=your_secret \
npm start
```

**Common Fixes:**
- ✅ Completely quit and restart VS Code (not just reload window)
- ✅ Clear npm cache: `npm cache clean --force`
- ✅ Reinstall dependencies if using source: `rm -rf node_modules && npm install`
- ✅ Check firewall isn't blocking npx or node
- ✅ Verify antivirus isn't quarantining executables

### Direct Line Connection Issues

1. **Verify Secret** - Check that `DIRECT_LINE_SECRET` is correct in your configuration
2. **Check Bot Status** - Ensure your Copilot Studio Agent is published and Direct Line channel is enabled
3. **Review Logs** - Server logs will show connection attempts and errors

### OAuth Authentication Issues (HTTP Mode)

#### OAuth flow not initiating

- **Symptom**: Browser doesn't open or shows 404 error
- **Solution**: Verify environment variables are set:
  - `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`
  - `ENTRA_REDIRECT_URI` matches your Azure app registration
- **Check**: Ensure OAuth discovery endpoint is accessible: `GET /.well-known/oauth-authorization-server`

#### "Invalid state parameter" error during callback

- **Symptom**: Authentication fails with state mismatch error
- **Solution**: This indicates a CSRF protection failure or expired auth flow
  - Restart the authentication flow (don't reuse old authorization URLs)
  - Check that cookies are enabled in your browser
  - Verify `SESSION_SECRET` is consistent (not changing between requests)
  - Auth flows expire after 10 minutes - complete the flow quickly

#### "Token refresh failed" or "Refresh token invalid"

- **Symptom**: Session becomes invalid after the access token expires
- **Solution**: User must re-authenticate
  - This is expected behavior when refresh tokens expire or are invalidated
  - Direct users to `/auth/login` to re-authenticate
  - Check Azure Entra ID for token lifetime policies

#### Bearer token authentication fails in VS Code

- **Symptom**: VS Code shows authentication error or 401 Unauthorized
- **Solution**:
  - Verify the session token was correctly returned in the callback
  - Check that the token is being sent in the `Authorization: Bearer <token>` header
  - Ensure the session hasn't expired (24-hour timeout)
  - Try signing out and back in: visit `/auth/logout` then `/auth/login`

### Common Errors

#### Failed to generate Direct Line token

- Verify your `DIRECT_LINE_SECRET` is correct
- Check that the Direct Line channel is enabled in Azure Bot Service
- Ensure the secret hasn't expired or been regenerated in Azure Portal

#### Conversation not found or expired

- Conversations expire after 30 minutes of inactivity
- Start a new conversation with `start_conversation` tool
- Check conversation ID is being passed correctly in subsequent calls

#### Circuit breaker is OPEN

- The server detected multiple failures and is protecting against cascading failures
- Wait 60 seconds for the circuit breaker to attempt recovery
- Check Direct Line API connectivity
- Review server logs for the root cause (authentication, network, or service issues)

#### "Authentication required" in HTTP mode

- **Symptom**: All requests return 401 Unauthorized
- **Solution**: HTTP mode requires OAuth authentication
  - Visit the server URL in a browser (e.g., `http://localhost:3000`)
  - Click "Sign in with Microsoft" and complete the OAuth flow
  - Ensure your MCP client supports OAuth 2.0 authentication
  - For VS Code: The extension will automatically handle the OAuth flow

### VS Code MCP Configuration Guide

The `.vscode/mcp.json` file configures how VS Code connects to MCP servers. Here's a comprehensive guide:

#### Configuration File Location

Create the file at: `.vscode/mcp.json` in your workspace root

#### Stdio Transport (Local Development)

**Recommended: Using input prompts for secrets**
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

**Alternative: Hardcoded secret (not recommended for shared projects)**
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

**Local development from source:**
```json
{
  "servers": {
    "copilot-studio-local": {
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

#### HTTP Transport (Remote Server)

**OAuth-enabled remote server:**
```json
{
  "servers": {
    "copilot-studio-production": {
      "type": "http",
      "url": "https://your-mcp-server.azurecontainerapps.io/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "https://your-mcp-server.azurecontainerapps.io/authorize",
        "tokenUrl": "https://your-mcp-server.azurecontainerapps.io/auth/token",
        "clientId": "optional-client-id",
        "scopes": ["openid", "profile", "email"]
      }
    }
  }
}
```

**Local HTTP server (for testing):**
```json
{
  "servers": {
    "copilot-studio-http-local": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "http://localhost:3000/authorize",
        "tokenUrl": "http://localhost:3000/auth/token"
      }
    }
  }
}
```

#### Configuration Options

**Server Configuration Fields:**
- `type`: Transport mode (`stdio` or `http`)
- `command`: Executable to run (stdio only)
- `args`: Command-line arguments array
- `env`: Environment variables object
- `url`: Server endpoint URL (http only)
- `auth`: Authentication configuration (http only)

**Input Types:**
- `promptString`: Text input (use `password: true` for secrets)
- `promptNumber`: Numeric input
- `promptBoolean`: Yes/no selection

**Environment Variables:**
- `DIRECT_LINE_SECRET`: Required - Your Direct Line secret key
- `LOG_LEVEL`: Optional - `debug` | `info` | `warn` | `error` (default: `info`)
- `TOKEN_REFRESH_INTERVAL`: Optional - Token refresh interval in milliseconds (default: `1800000`)
- `NODE_ENV`: Optional - `development` | `production`

**Best Practices:**
- ✅ Use input prompts for secrets to avoid committing them
- ✅ Name servers descriptively (e.g., `copilot-studio-dev`, `copilot-studio-prod`)
- ✅ Use absolute paths when running from source
- ✅ Set `password: true` on secret inputs to mask values
- ❌ Don't commit secrets in hardcoded configurations
- ❌ Don't share `.vscode/mcp.json` with hardcoded secrets

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

### Deployment Scenario Examples

Here are complete configuration examples for common deployment scenarios:

#### Scenario 1: Local Development (VS Code)

**Use Case:** Individual developer testing locally with VS Code

**.vscode/mcp.json:**
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
    "copilot-studio-dev": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret}",
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      }
    }
  }
}
```

**Characteristics:**
- ✅ Zero network configuration
- ✅ Secret prompted at runtime (not committed)
- ✅ Debug logging enabled
- ✅ Fastest performance (stdio IPC)
- ✅ No OAuth required

---

#### Scenario 2: Team Development Server (HTTP Mode)

**Use Case:** Small team sharing a development MCP server

**Azure Container App Configuration:**

```bash
# Environment variables in Azure Container App
DIRECT_LINE_SECRET=<from-key-vault>
MCP_TRANSPORT_MODE=http
HTTP_PORT=443
NODE_ENV=development

# Azure Entra ID (development app registration)
ENTRA_TENANT_ID=<tenant-id>
ENTRA_CLIENT_ID=<dev-client-id>
ENTRA_CLIENT_SECRET=<from-key-vault>
ENTRA_REDIRECT_URI=https://dev-mcp.contoso.com/auth/callback
ENTRA_SCOPES=openid,profile,email

# CORS for VS Code + team domain
ALLOWED_ORIGINS=https://dev-mcp.contoso.com,https://vscode.dev,https://insiders.vscode.dev

# Development-friendly settings
SESSION_TIMEOUT=43200000  # 12 hours
LOG_LEVEL=info
ENABLE_RATE_LIMITING=true
RATE_LIMIT_MAX_REQUESTS=500  # Higher limit for development
```

**Team VS Code Configuration (.vscode/mcp.json):**
```json
{
  "servers": {
    "copilot-studio-team-dev": {
      "type": "http",
      "url": "https://dev-mcp.contoso.com/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "https://dev-mcp.contoso.com/authorize",
        "tokenUrl": "https://dev-mcp.contoso.com/auth/token",
        "scopes": ["openid", "profile", "email"]
      }
    }
  }
}
```

**Characteristics:**
- ✅ OAuth per-user authentication
- ✅ Shared development environment
- ✅ Audit logs per developer
- ✅ Higher rate limits for dev work
- ✅ 12-hour sessions (less re-auth)

---

#### Scenario 3: Production Multi-Tenant Deployment

**Use Case:** Enterprise production deployment with multiple customers

**Azure Container App with Bicep:**

```bicep
param containerAppName string = 'copilot-mcp-prod'
param location string = resourceGroup().location
param directLineSecret string = '@Microsoft.KeyVault(SecretUri=...)'
param entraClientSecret string = '@Microsoft.KeyVault(SecretUri=...)'
param customDomain string = 'mcp.contoso.com'

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    configuration: {
      ingress: {
        external: true
        targetPort: 443
        transport: 'http2'
        customDomains: [
          {
            name: customDomain
            certificateId: certificateResourceId
          }
        ]
      }
      secrets: [
        {
          name: 'direct-line-secret'
          keyVaultUrl: '...'
        }
        {
          name: 'entra-client-secret'
          keyVaultUrl: '...'
        }
      ]
    }
    template: {
      scale: {
        minReplicas: 2  # High availability
        maxReplicas: 20  # Auto-scale for load
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
      containers: [
        {
          name: 'mcp-server'
          image: 'contoso.azurecr.io/copilot-mcp:latest'
          env: [
            { name: 'MCP_TRANSPORT_MODE', value: 'http' }
            { name: 'HTTP_PORT', value: '443' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'LOG_LEVEL', value: 'warn' }
            { name: 'DIRECT_LINE_SECRET', secretRef: 'direct-line-secret' }
            { name: 'ENTRA_CLIENT_SECRET', secretRef: 'entra-client-secret' }
            { name: 'ENTRA_TENANT_ID', value: '...' }
            { name: 'ENTRA_CLIENT_ID', value: '...' }
            {
              name: 'ENTRA_REDIRECT_URI'
              value: 'https://mcp.contoso.com/auth/callback'
            }
            {
              name: 'ALLOWED_ORIGINS'
              value: 'https://mcp.contoso.com,https://vscode.dev'
            }
            { name: 'SESSION_TIMEOUT', value: '86400000' }
            { name: 'ENABLE_RATE_LIMITING', value: 'true' }
            { name: 'RATE_LIMIT_MAX_REQUESTS', value: '100' }
          ]
          resources: {
            cpu: '1.0'
            memory: '2Gi'
          }
        }
      ]
    }
  }
}
```

**Characteristics:**
- ✅ High availability (min 2 replicas)
- ✅ Auto-scaling up to 20 replicas
- ✅ Secrets in Azure Key Vault
- ✅ Custom domain with SSL
- ✅ Production rate limiting
- ✅ Centralized logging
- ✅ 24-hour session timeout

---

#### Scenario 4: Hybrid Deployment (Local + Remote)

**Use Case:** Developers use local MCP for dev, remote for staging/prod testing

**.vscode/mcp.json:**
```json
{
  "inputs": [
    {
      "id": "direct_line_secret_local",
      "type": "promptString",
      "description": "Direct Line secret for local development agent",
      "password": true
    }
  ],
  "servers": {
    "copilot-local": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-studio-agent-direct-line-mcp"],
      "env": {
        "DIRECT_LINE_SECRET": "${input:direct_line_secret_local}",
        "LOG_LEVEL": "debug"
      }
    },
    "copilot-staging": {
      "type": "http",
      "url": "https://staging-mcp.contoso.com/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "https://staging-mcp.contoso.com/authorize",
        "tokenUrl": "https://staging-mcp.contoso.com/auth/token"
      }
    },
    "copilot-production": {
      "type": "http",
      "url": "https://mcp.contoso.com/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "https://mcp.contoso.com/authorize",
        "tokenUrl": "https://mcp.contoso.com/auth/token"
      }
    }
  }
}
```

**Usage:**
1. Select `copilot-local` for fast local development
2. Select `copilot-staging` to test against staging environment
3. Select `copilot-production` for production testing/support

**Characteristics:**
- ✅ Multiple environments in one configuration
- ✅ Easy switching between environments
- ✅ Local development doesn't require network
- ✅ Staging/prod use OAuth authentication
- ✅ Different Copilot Studio agents per environment

---

#### Scenario 5: Docker Compose Local Stack

**Use Case:** Local testing of HTTP mode with OAuth before deploying

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MCP_TRANSPORT_MODE=http
      - HTTP_PORT=3000
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - DIRECT_LINE_SECRET=${DIRECT_LINE_SECRET}
      - ENTRA_TENANT_ID=${ENTRA_TENANT_ID}
      - ENTRA_CLIENT_ID=${ENTRA_CLIENT_ID}
      - ENTRA_CLIENT_SECRET=${ENTRA_CLIENT_SECRET}
      - ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
      - ALLOWED_ORIGINS=http://localhost:3000,vscode://vscode
      - SESSION_TIMEOUT=43200000
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**.env file:**
```bash
DIRECT_LINE_SECRET=your_secret_here
ENTRA_TENANT_ID=your_tenant_id
ENTRA_CLIENT_ID=your_client_id
ENTRA_CLIENT_SECRET=your_client_secret
```

**VS Code Configuration:**
```json
{
  "servers": {
    "copilot-docker-local": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "auth": {
        "type": "oauth2",
        "authorizationUrl": "http://localhost:3000/authorize",
        "tokenUrl": "http://localhost:3000/auth/token"
      }
    }
  }
}
```

**Start the stack:**
```bash
docker-compose up -d
```

**Characteristics:**
- ✅ Test HTTP mode locally
- ✅ Test OAuth flow before deploying
- ✅ Containerized environment
- ✅ Health checks configured
- ✅ Volume for persistent logs

---

### Deployment Comparison Matrix

| Scenario | Transport | Auth | Users | Setup Complexity | Use Case |
|----------|-----------|------|-------|------------------|----------|
| **Local Dev** | stdio | None | 1 | ⭐ Very Easy | Personal development |
| **Team Dev Server** | HTTP | OAuth | 5-50 | ⭐⭐ Easy | Small teams |
| **Production** | HTTP | OAuth | Unlimited | ⭐⭐⭐ Moderate | Enterprise |
| **Hybrid** | Both | Mixed | Team | ⭐⭐ Easy | Multi-environment |
| **Docker Compose** | HTTP | OAuth | 1-5 | ⭐⭐ Easy | Local HTTP testing |

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

## 💬 Support

For issues or questions, please open an issue on [GitHub](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues).

---

## License
This project is licensed under the [MIT License](LICENSE).

> **Disclaimer:** This is a personal project by Brad Stevens.  
> It is not affiliated with or endorsed by Microsoft Corporation.
