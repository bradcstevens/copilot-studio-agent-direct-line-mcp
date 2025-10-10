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
  - [📝 Troubleshooting](#-troubleshooting)
  - [🎩 Examples \& Best Practices](#-examples--best-practices)
  - [🙋‍♀️ Frequently Asked Questions](#️-frequently-asked-questions)
  - [📌 Contributing](#-contributing)
  - [🤝 Code of Conduct](#-code-of-conduct)
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

## ⚒️ Supported Tools

Interact with your Copilot Studio Agent using these tools:

- **send_message**: Send a message to the Copilot Studio Agent and receive a response.
- **start_conversation**: Start a new conversation with the Agent, optionally with an initial message.
- **end_conversation**: End a conversation and clean up resources.
- **get_conversation_history**: Retrieve message history for a conversation.

## 🔌 Installation & Getting Started

For the best experience, use Visual Studio Code and GitHub Copilot. See the [getting started documentation](./docs/GETTINGSTARTED.md) to use our MCP Server with other tools such as Claude Code and Cursor.

### Prerequisites

1. Install [VS Code](https://code.visualstudio.com/download) or [VS Code Insiders](https://code.visualstudio.com/insiders)
2. Install [Node.js](https://nodejs.org/en/download) 18+
3. Microsoft Copilot Studio Agent with Direct Line 3.0 enabled
4. Direct Line secret key from your Copilot Studio Agent

### Installation

#### ✨ One-Click Install (Recommended)

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_Copilot_Studio_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio-agent-direct-line-mcp&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22copilot-studio-agent-direct-line-mcp%22%5D%2C%22env%22%3A%7B%22DIRECT_LINE_SECRET%22%3A%22%24%7Binput%3Adirect_line_secret%7D%22%7D%7D&inputs=%5B%7B%22id%22%3A%22direct_line_secret%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Direct%20Line%20secret%20key%20from%20your%20Copilot%20Studio%20Agent%22%7D%5D)
[![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Copilot_Studio_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=copilot-studio-agent-direct-line-mcp&quality=insiders&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22copilot-studio-agent-direct-line-mcp%22%5D%2C%22env%22%3A%7B%22DIRECT_LINE_SECRET%22%3A%22%24%7Binput%3Adirect_line_secret%7D%22%7D%7D&inputs=%5B%7B%22id%22%3A%22direct_line_secret%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Direct%20Line%20secret%20key%20from%20your%20Copilot%20Studio%20Agent%22%7D%5D)

After installation, select GitHub Copilot Agent Mode and refresh the tools list. Learn more about Agent Mode in the [VS Code Documentation](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode).

#### 🧨 Manual Install with NPX

This installation method is the easiest for all users of Visual Studio Code.

In your project, add a `.vscode/mcp.json` file with the following content:

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

Save the file, then click 'Start' in the MCP Server panel.

In chat, switch to [Agent Mode](https://code.visualstudio.com/blogs/2025/02/24/introducing-copilot-agent-mode).

Click "Select Tools" and choose the available tools.

Open GitHub Copilot Chat and try a prompt like `Start a conversation with my Copilot Studio Agent`. The first time a tool is executed, you will be prompted for your Direct Line secret.

> 💥 We strongly recommend creating a `.github/copilot-instructions.md` in your project. This will enhance your experience using the Copilot Studio MCP Server with GitHub Copilot Chat.
> To start, just include "`This project uses Microsoft Copilot Studio Agents. Always check to see if the Copilot Studio MCP server has a tool relevant to the user's request`" in your copilot instructions file.

See the [getting started documentation](./docs/GETTINGSTARTED.md) for additional installation methods, including local development setup.

## 📝 Troubleshooting

See the [Troubleshooting guide](./docs/TROUBLESHOOTING.md) for help with common issues and logging.

## 🎩 Examples & Best Practices

Explore example prompts and usage patterns in our [Examples documentation](./docs/EXAMPLES.md).

For detailed tool reference and usage guides, refer to the [Usage Guide](./docs/USAGE_GUIDE.md).

## 🙋‍♀️ Frequently Asked Questions

For answers to common questions about the Copilot Studio Agent Direct Line MCP Server, see the [Frequently Asked Questions](./docs/FAQ.md).

## 📌 Contributing

We welcome contributions! During preview, please file issues for bugs, enhancements, or documentation improvements.

See our [Contributions Guide](./CONTRIBUTING.md) for:

- 🛠️ Development setup
- ✨ Adding new features
- 📝 Code style & testing
- 🔄 Pull request process

## 🤝 Code of Conduct

This project follows standard open-source community guidelines. We expect all contributors to be respectful and constructive in their interactions.

## License

Licensed under the [MIT License](./LICENSE.md).

---

_This project is not affiliated with or endorsed by Microsoft Corporation._
