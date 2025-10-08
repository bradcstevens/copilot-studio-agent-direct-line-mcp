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
import { SSEService } from './sse-service.js';

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
 * MCP HTTP Server with OAuth authentication and SSE support
 */
export class MCPHttpServer {
  private app: Express;
  private config: HttpServerConfig;
  private entraidClient: EntraIDClient;
  private sessionManager: SessionManager;
  private sseService: SSEService;

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
    this.sseService = new SSEService({
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 120000, // 2 minutes
      maxConnections: 1000,
      maxConnectionsPerUser: 5,
    });
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
      console.log(
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
        const { authUrl, state } = await this.entraidClient.initiateAuthFlow();

        // Store state in session for validation
        (req.session as any).oauthState = state;

        res.redirect(authUrl);
      } catch (error) {
        console.error('[HTTP] Login failed:', error);
        res.status(500).json({ error: 'Authentication initiation failed' });
      }
    });

    // OAuth callback endpoint
    this.app.get('/auth/callback', async (req, res) => {
      try {
        const { code, state } = req.query;

        if (!code || !state) {
          return res.status(400).json({ error: 'Missing code or state parameter' });
        }

        // Validate state
        const storedState = (req.session as any).oauthState;
        if (state !== storedState) {
          return res.status(400).json({ error: 'Invalid state parameter' });
        }

        // Exchange code for tokens
        const authResult = await this.entraidClient.handleCallback(
          code as string,
          state as string
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

        // Show success page
        const displayName = userContext.name || userContext.email || 'User';
        res.send(this.getSuccessPageHTML(displayName));
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

    // SSE stream endpoint (requires authentication)
    this.app.get('/mcp/stream', this.requireAuth.bind(this), async (req, res) => {
      try {
        const sessionId = (req.session as any).sessionId;
        const sessionToken = (req.session as any).sessionToken;

        // Session is already validated by requireAuth middleware
        const validation = await this.sessionManager.validateSession(
          sessionId,
          sessionToken,
          req.ip || '',
          req.get('user-agent') || ''
        );

        if (!validation.valid || !validation.session) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'Please sign in at /auth/login to access MCP services'
          });
        }

        const userId = validation.session.userContext.userId;

        // Create SSE connection
        const connectionId = this.sseService.createConnection(
          res,
          req.ip || '',
          req.get('user-agent') || '',
          userId
        );

        if (!connectionId) {
          return res.status(503).json({ error: 'Service unavailable - too many connections' });
        }

        console.log(
          `[HTTP] SSE connection established: ${connectionId} (user: ${userId})`
        );
      } catch (error) {
        console.error('[HTTP] SSE connection failed:', error);
        res.status(500).json({ error: 'Failed to establish SSE connection' });
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
   * Authentication middleware
   */
  private async requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
          <div class="endpoint-path">GET /mcp/stream</div>
          <div class="endpoint-desc">MCP Server-Sent Events stream (authenticated)</div>
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
  start(): void {
    this.app.listen(this.config.port, () => {
      console.log(`[HTTP] Server listening on port ${this.config.port}`);
    });
  }

  /**
   * Get Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get SSE service instance
   */
  getSSEService(): SSEService {
    return this.sseService;
  }

  /**
   * Stop the HTTP server
   */
  stop(): void {
    this.sseService.stop();
    console.log('[HTTP] Server stopped');
  }
}
