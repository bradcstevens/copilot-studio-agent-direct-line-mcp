/**
 * HTTP server for OAuth authentication and MCP over HTTP
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { randomBytes } from 'crypto';
import type { EntraIDClient } from './entraid-client.js';
import type { SessionManager } from './session-manager.js';
import type { UserContext, TokenMetadata, SecurityTracking } from '../types/session.js';
import type { EnhancedMCPServer } from '../server/mcp-server.js';

/**
 * HTTP server configuration
 */
export interface HttpServerConfig {
  port: number;
  sessionSecret: string;
  allowedOrigins?: string[];
  trustProxy?: boolean;
}

/**
 * CSRF token storage (in-memory for demo, use Redis in production)
 */
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * MCP HTTP Server with OAuth authentication
 */
export class MCPHttpServer {
  private app: Express;
  private config: HttpServerConfig;
  private entraidClient: EntraIDClient;
  private sessionManager: SessionManager;
  private mcpServer: EnhancedMCPServer | null = null;

  /**
   * Create a new MCP HTTP Server
   * @param config - Server configuration
   * @param entraidClient - Entra ID OAuth client
   * @param sessionManager - Session manager
   */
  constructor(
    config: HttpServerConfig,
    entraidClient: EntraIDClient,
    sessionManager: SessionManager
  ) {
    this.config = config;
    this.entraidClient = entraidClient;
    this.sessionManager = sessionManager;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // Trust proxy if configured (for accurate IP addresses behind load balancers)
    if (this.config.trustProxy) {
      this.app.set('trust proxy', 1);
    }

    // Security headers with Helmet
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: this.config.allowedOrigins || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      })
    );

    // Rate limiting for authentication endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many authentication requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/auth', authLimiter);

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Session middleware
    this.app.use(
      session({
        secret: this.config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
        name: 'mcp.sid',
      })
    );

    // Request logging middleware
    this.app.use(this.requestLogger.bind(this));
  }

  /**
   * Request logging middleware
   */
  private requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.error(
        `[HTTP] ${req.method} ${req.path} ${res.statusCode} ${duration}ms - ${req.ip} - ${req.get('user-agent')}`
      );
    });

    next();
  }

  /**
   * Set up routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // CSRF token endpoint
    this.app.get('/auth/csrf-token', (req, res) => {
      const token = this.generateCSRFToken();
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

      csrfTokens.set(token, { token, expiresAt });

      // Cleanup old tokens
      this.cleanupCSRFTokens();

      res.json({ csrfToken: token });
    });

    // OAuth login endpoint
    this.app.get('/auth/login', async (req, res) => {
      try {
        // Log all query parameters for debugging
        console.error('[OAuth] Login request query parameters:', req.query);

        // VS Code sends redirect_uri and state parameters
        const vscodeRedirectUri = req.query.redirect_uri as string | undefined;
        const vscodeState = req.query.state as string | undefined;

        const { authUrl, state } = await this.entraidClient.initiateAuthFlow();

        // Store state in session for validation
        (req.session as any).oauthState = state;

        // Store VS Code's redirect_uri and state if present
        if (vscodeRedirectUri) {
          (req.session as any).vscodeRedirectUri = vscodeRedirectUri;
          console.error('[OAuth] Stored VS Code redirect_uri:', vscodeRedirectUri);
        }
        if (vscodeState) {
          (req.session as any).vscodeState = vscodeState;
          console.error('[OAuth] Stored VS Code state:', vscodeState);
        }

        res.redirect(authUrl);
      } catch (error) {
        console.error('[HTTP] Login failed:', error);
        res.status(500).json({ error: 'Authentication initiation failed' });
      }
    });

    // OAuth callback endpoint
    this.app.get('/auth/callback', async (req, res) => {
      try {
        const { code, state: oauthState } = req.query;

        if (!code || !oauthState) {
          return res.status(400).json({ error: 'Missing code or state parameter' });
        }

        // Validate state
        const storedState = (req.session as any).oauthState;
        if (oauthState !== storedState) {
          return res.status(400).json({ error: 'Invalid state parameter' });
        }

        // Exchange code for tokens
        const authResult = await this.entraidClient.handleCallback(
          code as string,
          oauthState as string
        );

        if (!authResult.account) {
          return res.status(500).json({ error: 'No account information in token response' });
        }

        // Create user context
        const userContext: UserContext = {
          userId: authResult.account.homeAccountId,
          email: authResult.account.username,
          name: authResult.account.name,
          tenantId: authResult.account.tenantId,
        };

        // Create token metadata
        const tokenMetadata: TokenMetadata = {
          accessToken: authResult.accessToken,
          refreshToken: (authResult as any).refreshToken,
          idToken: authResult.idToken || '',
          expiresAt: authResult.expiresOn ? authResult.expiresOn.getTime() : Date.now() + 3600000,
          scopes: authResult.scopes || [],
        };

        // Create security tracking
        const security: SecurityTracking = {
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || '',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
        };

        // Create session
        const { sessionId, sessionToken } = await this.sessionManager.createSession({
          userContext,
          tokenMetadata,
          security,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
          createdAt: Date.now(),
        });

        // Store session info in Express session
        (req.session as any).sessionId = sessionId;
        (req.session as any).sessionToken = sessionToken;

        // Check if this is an OAuth flow from VS Code
        const vscodeRedirectUri = (req.session as any).vscodeRedirectUri;
        const vscodeState = (req.session as any).vscodeState;

        if (vscodeRedirectUri) {
          // For VS Code OAuth, redirect back to VS Code with authorization code
          // VS Code expects: redirect_uri?code=AUTH_CODE&state=STATE
          console.error('[OAuth] VS Code auth flow detected, redirecting to:', vscodeRedirectUri);
          console.error('[OAuth] Session token (as code):', sessionToken);
          console.error('[OAuth] VS Code state:', vscodeState);

          const redirectUrl = new URL(vscodeRedirectUri);
          redirectUrl.searchParams.set('code', sessionToken);
          if (vscodeState) {
            redirectUrl.searchParams.set('state', vscodeState);
          }

          // Clean up stored VS Code parameters
          delete (req.session as any).vscodeRedirectUri;
          delete (req.session as any).vscodeState;

          console.error('[OAuth] Final redirect URL:', redirectUrl.toString());
          res.redirect(redirectUrl.toString());
        } else {
          // Show success page for browser-based authentication
          const displayName = userContext.name || userContext.email || 'User';
          res.send(this.getSuccessPageHTML(displayName));
        }
      } catch (error) {
        console.error('[HTTP] Callback failed:', error);
        res.status(500).json({ error: 'Authentication callback failed' });
      }
    });

    // Token refresh endpoint
    this.app.post('/auth/refresh', this.requireAuth.bind(this), async (req, res) => {
      try {
        const sessionId = (req.session as any).sessionId;
        const sessionToken = (req.session as any).sessionToken;

        const validation = await this.sessionManager.validateSession(
          sessionId,
          sessionToken,
          req.ip || '',
          req.get('user-agent') || ''
        );

        if (!validation.valid || !validation.session) {
          return res.status(401).json({ error: 'Invalid session' });
        }

        // Refresh access token
        const authResult = await this.entraidClient.refreshAccessToken(
          validation.session.tokenMetadata.refreshToken!
        );

        // Update session with new tokens
        await this.sessionManager.updateSession(sessionId, {
          tokenMetadata: {
            ...validation.session.tokenMetadata,
            accessToken: authResult.accessToken,
            refreshToken: (authResult as any).refreshToken || validation.session.tokenMetadata.refreshToken,
            expiresAt: authResult.expiresOn ? authResult.expiresOn.getTime() : Date.now() + 3600000,
          },
        });

        res.json({ success: true, expiresAt: authResult.expiresOn?.getTime() });
      } catch (error) {
        console.error('[HTTP] Token refresh failed:', error);
        res.status(500).json({ error: 'Token refresh failed' });
      }
    });

    // Logout endpoint
    this.app.post('/auth/logout', this.requireAuth.bind(this), async (req, res) => {
      try {
        const sessionId = (req.session as any).sessionId;

        if (sessionId) {
          await this.sessionManager.terminateSession(sessionId);
        }

        req.session.destroy((err) => {
          if (err) {
            console.error('[HTTP] Session destruction failed:', err);
          }
        });

        res.json({ success: true });
      } catch (error) {
        console.error('[HTTP] Logout failed:', error);
        res.status(500).json({ error: 'Logout failed' });
      }
    });

    // Auth status endpoint
    this.app.get('/auth/status', async (req, res) => {
      try {
        const sessionId = (req.session as any).sessionId;
        const sessionToken = (req.session as any).sessionToken;

        if (!sessionId || !sessionToken) {
          return res.json({ authenticated: false });
        }

        const validation = await this.sessionManager.validateSession(
          sessionId,
          sessionToken,
          req.ip || '',
          req.get('user-agent') || ''
        );

        if (!validation.valid || !validation.session) {
          return res.json({ authenticated: false });
        }

        res.json({
          authenticated: true,
          user: {
            userId: validation.session.userContext.userId,
            email: validation.session.userContext.email,
            name: validation.session.userContext.name,
          },
          requiresRefresh: validation.requiresRefresh,
        });
      } catch (error) {
        console.error('[HTTP] Status check failed:', error);
        res.status(500).json({ error: 'Status check failed' });
      }
    });

    // OAuth Authorization Endpoint (standard location)
    this.app.get('/authorize', (req, res) => {
      // Log all query parameters for debugging
      console.error('[OAuth] /authorize request query parameters:', req.query);

      // Redirect to our auth/login endpoint, preserving all query parameters
      const queryString = new URLSearchParams(req.query as any).toString();
      const loginUrl = `/auth/login${queryString ? `?${queryString}` : ''}`;
      console.error('[OAuth] Authorization request, redirecting to:', loginUrl);
      res.redirect(loginUrl);
    });

    // OAuth Discovery Endpoints for MCP clients
    // OpenID Connect Discovery
    this.app.get('/.well-known/openid-configuration', (req, res) => {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/auth/token`,
        userinfo_endpoint: `${baseUrl}/auth/userinfo`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'profile', 'email'],
      });
    });

    // OAuth Protected Resource Discovery
    this.app.get('/.well-known/oauth-protected-resource', (req, res) => {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json({
        resource: `${baseUrl}/mcp`,
        authorization_servers: [baseUrl],
        bearer_methods_supported: ['header', 'body'],
        resource_documentation: `${baseUrl}/docs`,
      });
    });

    // OAuth Authorization Server Metadata
    this.app.get('/.well-known/oauth-authorization-server', (req, res) => {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/auth/token`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
      });
    });

    // OAuth Token Endpoint (for MCP clients)
    this.app.post('/auth/token', async (req, res) => {
      try {
        const { grant_type, code } = req.body;

        // For device/client credentials flow, return error with login URL
        if (!grant_type || grant_type !== 'authorization_code') {
          res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Please use the browser-based authentication flow. Open the authorization URL in your browser.',
            authorization_url: `${req.protocol}://${req.get('host')}/auth/login`,
          });
          return;
        }

        // Exchange authorization code for access token
        // For simplicity, we treat the session token as the access token
        const sessionId = (req.session as any).sessionId;
        const sessionToken = (req.session as any).sessionToken;

        if (!sessionId || !sessionToken) {
          res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid or expired authorization code',
          });
          return;
        }

        // Return access token response
        res.json({
          access_token: sessionToken,
          token_type: 'Bearer',
          expires_in: 86400, // 24 hours
          scope: 'openid profile email',
        });
      } catch (error) {
        console.error('[OAuth] Token endpoint error:', error);
        res.status(500).json({
          error: 'server_error',
          error_description: 'An error occurred processing the token request',
        });
      }
    });

    // Userinfo Endpoint (for MCP clients)
    this.app.get('/auth/userinfo', this.requireAuth.bind(this), async (req, res) => {
      try {
        const userContext = (req as any).userContext || (req as any).mcpSession?.userContext;

        if (!userContext) {
          res.status(401).json({
            error: 'unauthorized',
            error_description: 'Valid authentication required',
          });
          return;
        }

        res.json({
          sub: userContext.userId,
          email: userContext.email,
          name: userContext.name,
          email_verified: true,
        });
      } catch (error) {
        console.error('[OAuth] Userinfo endpoint error:', error);
        res.status(500).json({
          error: 'server_error',
          error_description: 'An error occurred retrieving user information',
        });
      }
    });

    // MCP endpoint for HTTP transport
    // Authentication is optional based on REQUIRE_MCP_AUTH environment variable
    const mcpAuthMiddleware = process.env.REQUIRE_MCP_AUTH === 'true'
      ? this.requireAuth.bind(this)
      : (req: Request, res: Response, next: NextFunction) => next();

    this.app.post('/mcp', mcpAuthMiddleware, async (req, res) => {
      if (!this.mcpServer) {
        res.status(503).json({
          error: 'MCP server not initialized',
          message: 'The MCP server has not been initialized yet. Please try again later.',
        });
        return;
      }

      try {
        console.error('[HTTP] POST /mcp - Handling message');
        // Use new HTTP POST handler for direct JSON-RPC communication (VS Code compatible)
        await (this.mcpServer as any).handleHttpMessage(req, res);
      } catch (error) {
        console.error('[HTTP] MCP message error:', error);
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({
            error: 'MCP message failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    // Simple login page
    this.app.get('/', (req, res) => {
      const sessionId = (req.session as any).sessionId;
      if (sessionId) {
        // Already authenticated - show dashboard
        res.send(this.getDashboardHTML());
      } else {
        // Not authenticated - show login page
        res.send(this.getLoginPageHTML());
      }
    });
  }

  /**
   * Authentication middleware - supports both session cookies and bearer tokens
   */
  private async requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for Bearer token first (for MCP clients)
      const authHeader = req.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
          // Validate bearer token (it's actually a session token)
          const sessions = await this.sessionManager.getUserSessions('bearer-token');
          const validSession = sessions.find((s: any) => s.sessionToken === token);

          if (validSession) {
            // Store user context in request for later use
            (req as any).userContext = validSession.userContext;
            return next();
          }
        } catch (error) {
          console.error('[Auth] Bearer token validation error:', error);
        }

        res.status(401).json({
          error: 'Invalid token',
          message: 'The provided bearer token is invalid or expired.',
          code: 'INVALID_BEARER_TOKEN'
        });
        return;
      }

      // Fall back to session cookie authentication
      const sessionId = (req.session as any).sessionId;
      const sessionToken = (req.session as any).sessionToken;

      if (!sessionId || !sessionToken) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'You must sign in to access this resource.',
          loginUrl: '/auth/login',
          code: 'NO_SESSION'
        });
        return;
      }

      const validation = await this.sessionManager.validateSession(
        sessionId,
        sessionToken,
        req.ip || '',
        req.get('user-agent') || ''
      );

      if (!validation.valid) {
        res.status(401).json({
          error: 'Session expired or invalid',
          message: 'Your session has expired. Please sign in again.',
          loginUrl: '/auth/login',
          code: 'INVALID_SESSION'
        });
        return;
      }

      // Attach session to request
      (req as any).mcpSession = validation.session;

      next();
    } catch (error) {
      console.error('[HTTP] Auth middleware failed:', error);
      res.status(500).json({
        error: 'Authentication failed',
        message: 'An error occurred while verifying your authentication.',
        code: 'AUTH_ERROR'
      });
    }
  }

  /**
   * Generate login page HTML
   */
  private getLoginPageHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In - Copilot Studio MCP Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 400px;
      width: 100%;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
      text-align: center;
    }
    p {
      color: #666;
      margin-bottom: 30px;
      text-align: center;
      line-height: 1.6;
    }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-decoration: none;
    }
    .btn:hover {
      background: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    .btn:active {
      transform: translateY(0);
    }
    .icon {
      width: 20px;
      height: 20px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin-bottom: 25px;
      border-radius: 4px;
    }
    .info-box h3 {
      color: #667eea;
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .info-box ul {
      list-style: none;
      color: #555;
      font-size: 13px;
    }
    .info-box li {
      padding: 4px 0;
      padding-left: 20px;
      position: relative;
    }
    .info-box li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Sign In Required</h1>
    <p>Please authenticate with Microsoft to access the Copilot Studio MCP Server</p>

    <div class="info-box">
      <h3>What you get:</h3>
      <ul>
        <li>Secure authentication via Azure Entra ID</li>
        <li>Personal isolated conversations</li>
        <li>Access to Copilot Studio Agent tools</li>
        <li>Full audit trail of your interactions</li>
      </ul>
    </div>

    <a href="/auth/login" class="btn">
      <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
      </svg>
      Sign in with Microsoft
    </a>

    <div class="footer">
      <p>Powered by Azure Entra ID</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate dashboard HTML for authenticated users
   */
  private getDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Copilot Studio MCP Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f7fa;
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      color: #333;
      font-size: 24px;
    }
    .btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn:hover {
      background: #c82333;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 24px;
      margin-bottom: 20px;
    }
    .card h2 {
      color: #333;
      margin-bottom: 16px;
      font-size: 18px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 6px;
      color: #155724;
      margin-bottom: 16px;
    }
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #28a745;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .info-item {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 16px;
      color: #333;
      font-weight: 600;
    }
    .endpoint-list {
      list-style: none;
    }
    .endpoint-list li {
      padding: 12px;
      background: #f8f9fa;
      margin-bottom: 8px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .endpoint-path {
      font-family: 'Courier New', monospace;
      color: #667eea;
      font-weight: 600;
    }
    .endpoint-desc {
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Authenticated - MCP Server Dashboard</h1>
    <form action="/auth/logout" method="POST" style="display: inline;">
      <button type="submit" class="btn">Sign Out</button>
    </form>
  </div>

  <div class="card">
    <div class="status">
      <div class="status-dot"></div>
      <strong>Connected and Authenticated</strong>
    </div>

    <h2>Session Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">Active</div>
      </div>
      <div class="info-item">
        <div class="info-label">Transport</div>
        <div class="info-value">HTTP + OAuth</div>
      </div>
      <div class="info-item">
        <div class="info-label">Server</div>
        <div class="info-value">Running</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Available Endpoints</h2>
    <ul class="endpoint-list">
      <li>
        <div>
          <div class="endpoint-path">GET /health</div>
          <div class="endpoint-desc">Server health check</div>
        </div>
      </li>
      <li>
        <div>
          <div class="endpoint-path">GET /auth/status</div>
          <div class="endpoint-desc">Check authentication status</div>
        </div>
      </li>
      <li>
        <div>
          <div class="endpoint-path">POST /mcp</div>
          <div class="endpoint-desc">MCP HTTP transport endpoint</div>
        </div>
      </li>
      <li>
        <div>
          <div class="endpoint-path">POST /auth/logout</div>
          <div class="endpoint-desc">End your session</div>
        </div>
      </li>
    </ul>
  </div>

  <div class="card">
    <h2>Next Steps</h2>
    <p style="color: #666; line-height: 1.6;">
      Your session is active and you can now use the MCP server endpoints.
      Connect your MCP client to this server to interact with your Copilot Studio Agent.
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate VS Code authentication complete page
   * This page signals to VS Code that auth is complete and can close the window
   */
  private getVSCodeAuthCompleteHTML(accessToken: string, state: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Complete</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .checkmark {
      font-size: 4rem;
      animation: scaleIn 0.5s ease;
    }
    @keyframes scaleIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }
    h1 { margin: 1rem 0; }
    p { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Authentication Complete!</h1>
    <p>You can close this window and return to VS Code.</p>
    <p style="font-size: 0.9rem; margin-top: 2rem; opacity: 0.7;">This window will close automatically...</p>
  </div>
  <script>
    // Try to close the window automatically
    setTimeout(() => {
      window.close();
    }, 2000);

    // Also try to send a message to the opener (VS Code)
    if (window.opener) {
      window.opener.postMessage({
        type: 'oauth-callback',
        access_token: '${accessToken}',
        state: '${state}'
      }, '*');
    }
  </script>
</body>
</html>
`;
  }

  /**
   * Generate success page HTML after authentication
   */
  private getSuccessPageHTML(userName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Successful</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .success-icon {
      width: 80px;
      height: 80px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      animation: scaleIn 0.5s ease;
    }
    .success-icon svg {
      width: 50px;
      height: 50px;
      color: white;
    }
    @keyframes scaleIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .user-name {
      color: #667eea;
      font-weight: 600;
      font-size: 18px;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      margin-bottom: 15px;
      line-height: 1.6;
    }
    .info-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 25px 0;
      border-radius: 4px;
      text-align: left;
    }
    .info-box h3 {
      color: #10b981;
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .info-box ul {
      list-style: none;
      color: #555;
      font-size: 13px;
    }
    .info-box li {
      padding: 4px 0;
      padding-left: 20px;
      position: relative;
    }
    .info-box li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    .close-instruction {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin-top: 20px;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
      font-weight: 500;
    }
    .footer {
      margin-top: 30px;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
      </svg>
    </div>

    <h1>✅ Authentication Successful!</h1>
    <p class="user-name">Welcome, ${userName}</p>
    <p>You have successfully signed in to the Copilot Studio MCP Server.</p>

    <div class="info-box">
      <h3>Your session is now active:</h3>
      <ul>
        <li>Authenticated via Azure Entra ID</li>
        <li>Your conversations are isolated and secure</li>
        <li>Access to all MCP tools enabled</li>
        <li>Session expires in 24 hours</li>
      </ul>
    </div>

    <div class="close-instruction">
      <strong>📱 You can now close this browser tab</strong><br>
      Your MCP client (VS Code, Cursor, etc.) is now authenticated and ready to use.
    </div>

    <div class="footer">
      <p>Secured by Azure Entra ID</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate CSRF token
   */
  private generateCSRFToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired CSRF tokens
   */
  private cleanupCSRFTokens(): void {
    const now = Date.now();
    for (const [token, data] of csrfTokens.entries()) {
      if (now >= data.expiresAt) {
        csrfTokens.delete(token);
      }
    }
  }

  /**
   * Start the HTTP server
   */
  /**
   * Set MCP server instance for HTTP transport
   */
  setMCPServer(server: EnhancedMCPServer): void {
    this.mcpServer = server;
    console.error('[HTTP] MCP server instance connected');
  }

  start(): void {
    this.app.listen(this.config.port, () => {
      console.error(`[HTTP] Server listening on port ${this.config.port}`);
    });
  }

  /**
   * Get Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Stop the HTTP server
   */
  stop(): void {
    console.error('[HTTP] Server stopped');
  }
}
