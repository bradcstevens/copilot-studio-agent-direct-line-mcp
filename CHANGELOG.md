# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2025-10-08

### Added
- **VS Code OAuth Integration**: Improved OAuth authentication flow for VS Code HTTP MCP connections
  - Added query parameter preservation in `/authorize` endpoint
  - OAuth callback now redirects to VS Code's callback URL with authorization code
  - Automatic browser window closure after successful authentication
  - Debug logging for OAuth parameters and redirect URLs
- **SESSION_SECRET Auto-Generation**: Server automatically generates secure session secrets if not provided
- **Bearer Token Authentication**: Enhanced `requireAuth()` middleware to support both session cookies and bearer tokens

### Changed
- **OAuth Callback Behavior**: Modified `/auth/callback` endpoint to detect VS Code OAuth flows and redirect appropriately
  - Browser-based flows: Show success page with user display name
  - VS Code flows: Redirect to VS Code callback URL with authorization code and state
- **OAuth Parameter Handling**: Enhanced `/auth/login` endpoint to capture and store VS Code's `redirect_uri` and `state` parameters
- **Security Configuration**: Updated `security-config.ts` to auto-generate `SESSION_SECRET` using `crypto.randomBytes()`

### Fixed
- **TypeScript Variable Naming**: Resolved variable name collision in OAuth callback handler (`state` renamed to `oauthState`)
- **VS Code Authentication Window**: Fixed issue where VS Code authentication window would remain open after successful authentication
- **OAuth Discovery**: Ensured all OAuth discovery endpoints properly expose `/authorize` as the authorization endpoint

### Documentation
- Updated README.md with comprehensive OAuth authentication flow documentation
- Added VS Code integration details including automatic OAuth discovery
- Documented session management and auto-generated SESSION_SECRET behavior
- Enhanced authentication flow steps with client callback mechanism

## [1.0.6] - 2025-09-15

### Changed
- Updated README.md to indicate authentication requirements for MCP to function

## [1.0.5] - 2025-09-15

### Changed
- Documentation improvements

## [1.0.4] - 2025-09-15

### Changed
- README.md updates

## [1.0.3] - 2025-09-15

### Added
- Initial release with HTTP transport OAuth authentication support
- Azure Entra ID OAuth integration
- Session management with multiple storage backends
- MCP tools for Copilot Studio Agent interaction
