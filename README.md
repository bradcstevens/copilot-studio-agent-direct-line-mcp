# ⭐ Copilot Studio Agent Direct Line MCP Server

Easily install the Copilot Studio Agent Direct Line MCP Server for VS Code or VS Code Insiders:

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_Copilot_Studio_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio&config=%7B%20%22type%22%3A%20%22stdio%22%2C%20%22command%22%3A%20%22npx%22%2C%20%22args%22%3A%20%5B%22-y%22%2C%20%22copilot-studio-agent-direct-line-mcp%22%5D%7D)
[![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Copilot_Studio_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio&quality=insiders&config=%7B%20%22type%22%3A%20%22stdio%22%2C%20%22command%22%3A%20%22npx%22%2C%20%22args%22%3A%20%5B%22-y%22%2C%20%22copilot-studio-agent-direct-line-mcp%22%5D%7D)

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
      - [✨ One-Click Install](#-one-click-install)
      - [🧨 Install from GitHub (Recommended)](#-install-from-github-recommended)
        - [Steps](#steps)
  - [🔧 Configuration](#-configuration)
  - [🚀 Development](#-development)
  - [📖 Usage](#-usage)
  - [🏗️ Architecture](#️-architecture)
  - [🔑 Key Components](#-key-components)
  - [🛡️ Error Handling](#️-error-handling)
  - [🔒 Security](#-security)
  - [📝 Troubleshooting](#-troubleshooting)
  - [🧪 Testing](#-testing)
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

#### ✨ One-Click Install

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_Copilot_Studio_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio&config=%7B%20%22type%22%3A%20%22stdio%22%2C%20%22command%22%3A%20%22npx%22%2C%20%22args%22%3A%20%5B%22-y%22%2C%20%22copilot-studio-agent-direct-line-mcp%22%5D%7D)
[![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Copilot_Studio_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio&quality=insiders&config=%7B%20%22type%22%3A%20%22stdio%22%2C%20%22command%22%3A%20%22npx%22%2C%20%22args%22%3A%20%5B%22-y%22%2C%20%22copilot-studio-agent-direct-line-mcp%22%5D%7D)

After installation, select GitHub Copilot Agent Mode and refresh the tools list. Learn more about Agent Mode in the [VS Code Documentation](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode).

#### 🧨 Install from GitHub (Recommended)

This installation method is the easiest for development and testing.

##### Steps

1. Clone this repository:

```bash
git clone https://github.com/bradcstevens/copilot-studio-agent-direct-line-mcp.git
cd copilot-studio-agent-direct-line-mcp
npm install
npm run build
```

2. In your project, add a `.vscode/mcp.json` file with the following content:

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
    "copilot-studio": {
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

3. Save the file, then click 'Start' in the MCP Server panel.

4. In chat, switch to [Agent Mode](https://code.visualstudio.com/blogs/2025/02/24/introducing-copilot-agent-mode).

5. Click "Select Tools" and choose the available tools.

6. Open GitHub Copilot Chat and try a prompt like `Start a conversation with my Copilot Studio Agent`.

> 💥 We strongly recommend creating a `.github/copilot-instructions.md` in your project. This will enhance your experience using the Copilot Studio Agent Direct Line MCP Server with GitHub Copilot Chat.
> To start, just include "`This project uses Microsoft Copilot Studio Agents. Always check to see if the Copilot Studio MCP server has a tool relevant to the user's request`" in your copilot instructions file.

## 🔧 Configuration

Create `.env` file based on `.env.example`:

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

### Standalone Server Usage

You can run the server standalone for testing or integration with other MCP clients:

```bash
# After building
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

Here's a complete example configuration for macOS:

```json
{
  "servers": {
    "copilot-studio": {
      "command": "node",
      "args": [
        "/Users/yourname/code/copilot-studio-agent-direct-line-mcp/dist/index.js"
      ],
      "env": {
        "DIRECT_LINE_SECRET": "your_secret_here",
        "LOG_LEVEL": "info",
        "TOKEN_REFRESH_INTERVAL": "1800000"
      }
    }
  }
}
```

**Windows example:**

```json
{
  "servers": {
    "copilot-studio": {
      "command": "node",
      "args": [
        "C:\\Users\\yourname\\code\\copilot-studio-agent-direct-line-mcp\\dist\\index.js"
      ],
      "env": {
        "DIRECT_LINE_SECRET": "your_secret_here"
      }
    }
  }
}
```

## 🧪 Testing

Run the included test client to verify functionality:

```bash
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
