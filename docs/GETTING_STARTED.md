# 🔌 Getting Started

This guide will help you install and configure the Copilot Studio Agent Direct Line MCP Server for VS Code.

## Prerequisites

1. Install [VS Code](https://code.visualstudio.com/download) or [VS Code Insiders](https://code.visualstudio.com/insiders)
2. Install [Node.js](https://nodejs.org/en/download) 18+
3. Microsoft Copilot Studio Agent with Direct Line 3.0 enabled
4. Direct Line secret key from your Copilot Studio Agent

## Installation Methods

### ✨ One-Click Install (Recommended)

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

### 🧨 Manual Install with NPX

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

### 🛠️ Install from Source (For Development)

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

## Basic Configuration

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
```

## Quick Start Usage

Once installed, try these prompts in GitHub Copilot Chat:

- "Start a conversation with my Copilot Studio Agent"
- "Ask my agent about product sizing"
- "Send a message to the agent: What are your capabilities?"
- "Get the conversation history"
- "End the current conversation"

## Pro Tips

> 💥 **Enhance GitHub Copilot:** Create a `.github/copilot-instructions.md` file in your project with:
> ```
> This project uses Microsoft Copilot Studio Agents. Always check to see if the
> Copilot Studio MCP server has a tool relevant to the user's request.
> ```
> This will enhance your experience with GitHub Copilot Chat!

## Next Steps

- **Advanced Configuration**: See the [Configuration Guide](./CONFIGURATION.md) for HTTP mode, OAuth, and deployment settings
- **Usage Patterns**: Explore the [Usage Guide](./USAGE_GUIDE.md) for detailed examples and best practices
- **Development Setup**: Check out the [VS Code Development Guide](./VSCODE_DEVELOPMENT.md) for local development workflow
- **Production Deployment**: Review the [Setup and Deployment Guide](./SETUP_AND_DEPLOYMENT.md) for production deployment options
- **Troubleshooting**: Visit the [Troubleshooting Guide](./TROUBLESHOOTING.md) if you encounter any issues

## Additional Resources

- **Authentication**: See [Authentication Modes Guide](./AUTHENTICATION_MODES.md) for stdio vs HTTP mode authentication
- **Azure Entra ID**: Check [Azure Entra ID Setup Guide](./ENTRA_ID_SETUP.md) for OAuth configuration
- **Architecture**: Review [Architecture Documentation](./ARCHITECTURE.md) to understand the system design
- **Error Handling**: Learn about error handling in the [Error Handling Guide](./ERROR_HANDLING.md)
