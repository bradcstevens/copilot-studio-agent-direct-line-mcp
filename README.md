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
      - [`send_message`](#send_message)
      - [`start_conversation`](#start_conversation)
      - [`end_conversation`](#end_conversation)
      - [`get_conversation_history`](#get_conversation_history)
  - [🏗️ Architecture](#️-architecture)
  - [🔑 Key Components](#-key-components)
    - [DirectLineClient](#directlineclient)
    - [TokenManager](#tokenmanager)
    - [ConversationManager](#conversationmanager)
    - [CircuitBreaker](#circuitbreaker)
  - [🛡️ Error Handling](#️-error-handling)
  - [🔒 Security](#-security)
  - [📝 Troubleshooting](#-troubleshooting)
    - [MCP Server Not Connecting in VS Code](#mcp-server-not-connecting-in-vs-code)
    - [Direct Line Connection Issues](#direct-line-connection-issues)
    - [Common Errors](#common-errors)
      - [Failed to generate Direct Line token](#failed-to-generate-direct-line-token)
      - [Conversation not found or expired](#conversation-not-found-or-expired)
      - [Circuit breaker is OPEN](#circuit-breaker-is-open)
    - [Example VS Code mcp.json Configuration](#example-vs-code-mcpjson-configuration)
  - [🧪 Testing](#-testing)
    - [Testing the MCP Server](#testing-the-mcp-server)
    - [Running Test Client (For Development)](#running-test-client-for-development)
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
- ✅ **Error Handling** - Retry logic with exponential backoff, circuit breaker pattern
- ✅ **Input Validation** - Zod schemas for type-safe validation
- ✅ **Security** - Secret masking in logs, secure environment configuration

## 🔐 Authentication Requirements

> **Important:** This MCP server currently supports **Copilot Studio Agents configured with "No authentication"** only.
>
> In Copilot Studio, ensure your agent's **Security > Authentication** setting is set to **"No authentication"** for this MCP server to work properly.
>
> 🚧 **Coming Soon:** Entra ID (Azure AD) authentication support is under development and will be available in a future release.

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
# Clone and build
git clone https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp.git
cd copilot-studio-agent-direct-line-mcp
npm install
npm run build

# Add to .vscode/mcp.json
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
# Required
DIRECT_LINE_SECRET=your_direct_line_secret_here

# Optional
LOG_LEVEL=info
TOKEN_REFRESH_INTERVAL=1800000  # 30 minutes in ms
```

## 🚀 Development

```bash
# Build
npm run build

# Development mode with watch
npm run dev

# Lint
npm run lint

# Format
npm run format
```

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
├── server/          # MCP server implementation
│   ├── mcp-server.ts       # Main MCP server class
│   ├── tool-schemas.ts     # Zod validation schemas
│   └── mcp-response.ts     # Response formatting & error handling
├── services/        # Core business logic
│   ├── directline-client.ts      # Direct Line API client with circuit breaker
│   ├── token-manager.ts          # Token caching & refresh
│   ├── conversation-manager.ts   # Conversation lifecycle management
│   └── http-client.ts            # Axios HTTP client
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
    ├── retry.ts              # Retry logic with exponential backoff
    ├── circuit-breaker.ts    # Circuit breaker pattern
    └── secret-masking.ts     # Security utilities
```

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

Prevents cascading failures with:

- 3 states: CLOSED, OPEN, HALF_OPEN
- Configurable failure threshold (5 failures in 30s)
- Recovery timeout (60s)
- Success threshold for recovery (3 consecutive successes)

## 🛡️ Error Handling

The server implements comprehensive error handling:

1. **Retry Logic**: Exponential backoff (1s, 2s, 4s delays, max 3 retries)
2. **Circuit Breaker**: Automatic fail-fast when service is degraded
3. **Error Classification**: Categorizes errors (network, auth, rate limit, etc.)
4. **MCP Error Transformation**: Converts internal errors to MCP-compliant responses

## 🔒 Security

- **No Secret Logging**: Direct Line secret and tokens are never logged
- **Secret Masking**: Shows only first 4 and last 4 characters in logs
- **Environment Validation**: Zod schema validation for configuration
- **In-Memory Only**: No disk persistence of sensitive data

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

### Testing the MCP Server

The easiest way to test is through VS Code after installation:

1. Install using the one-click badge or manual npx configuration
2. Open GitHub Copilot Chat in Agent Mode
3. Try prompts like:
   - "Start a conversation with my Copilot Studio Agent"
   - "Send a message: Hello, what can you help me with?"
   - "Get the conversation history"

### Running Test Client (For Development)

If you've cloned the repository, you can run the included test client:

```bash
# Set your Direct Line secret
export DIRECT_LINE_SECRET=your_secret_here

# Run tests
npx tsx tests/test-mcp-client.ts
```

This will test all 4 MCP tools and verify integration with your Copilot Studio Agent.

## 📌 Contributing

We welcome contributions! Please file issues for bugs, enhancements, or documentation improvements.

For development setup:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/my-feature`
7. Submit a pull request

## License

Licensed under the [MIT License](./LICENSE).

## 💬 Support

For issues or questions, please open an issue on [GitHub](https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp/issues).

---

_This project is not affiliated with or endorsed by Microsoft Corporation._
