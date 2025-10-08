/**
 * Production security configuration
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * HTTPS enforcement middleware
 * Redirects HTTP requests to HTTPS in production
 */
export function enforceHTTPS(req: Request, res: Response, next: NextFunction): void {
  // Skip if already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Redirect to HTTPS
  const httpsUrl = `https://${req.headers.host}${req.url}`;
  console.warn(`[Security] Redirecting HTTP request to HTTPS: ${req.url}`);
  res.redirect(301, httpsUrl);
}

/**
 * Enhanced Helmet security headers configuration
 */
export const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for SSE client
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"], // Restrict AJAX/SSE connections
      fontSrc: ["'self'"],
      objectSrc: ["'none'"], // Disable plugins
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Disable iframes
      frameAncestors: ["'none'"], // Prevent clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-Download-Options
  ieNoOpen: true,

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },

  // X-XSS-Protection (legacy, but still useful)
  xssFilter: true,
};

/**
 * Secure cookie configuration
 */
export const secureCookieConfig = {
  httpOnly: true, // Prevent JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  signed: true, // Sign cookies
  domain: process.env.COOKIE_DOMAIN, // Set domain if needed
  path: '/',
};

/**
 * Session configuration with enhanced security
 */
export const secureSessionConfig = {
  secret: process.env.SESSION_SECRET || 'mcp-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on each request
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.COOKIE_DOMAIN,
  },
  name: 'mcp.sid', // Custom session cookie name
  proxy: process.env.TRUST_PROXY === 'true',
};

/**
 * CORS configuration for production
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check allowed origins from environment
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    if (process.env.NODE_ENV !== 'production') {
      // Allow all in development
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 600, // Cache preflight requests for 10 minutes
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many authentication requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many requests, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
  },
  strict: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute (for sensitive endpoints)
    message: 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
  },
};

/**
 * Security headers middleware (additional to Helmet)
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Disable caching for sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

/**
 * Remove sensitive headers from responses
 */
export function removeSensitiveHeaders(req: Request, res: Response, next: NextFunction): void {
  // Remove server identification headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
}

/**
 * Request sanitization middleware
 * Validates and sanitizes common attack vectors
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript protocol
  ];

  const url = req.url.toLowerCase();
  const hashreat = suspiciousPatterns.some((pattern) => pattern.test(url));

  if (hashreat) {
    console.warn(`[Security] Suspicious request detected: ${req.method} ${req.url} from ${req.ip}`);
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  next();
}

/**
 * IP whitelist middleware (optional)
 */
export function ipWhitelist(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.socket.remoteAddress || '';

    if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('*')) {
      console.warn(`[Security] IP ${clientIP} not in whitelist`);
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    next();
  };
}

/**
 * Certificate-based authentication middleware
 * Validates client certificates for mutual TLS
 */
export function certificateAuth(req: Request, res: Response, next: NextFunction): void {
  // Check if client certificate is present
  const cert = (req as any).socket.getPeerCertificate();

  if (!cert || !cert.subject) {
    console.warn('[Security] No client certificate provided');
    res.status(401).json({ error: 'Client certificate required' });
    return;
  }

  // Validate certificate
  if (!(req as any).client.authorized) {
    console.warn('[Security] Invalid client certificate');
    res.status(401).json({ error: 'Invalid client certificate' });
    return;
  }

  // Extract certificate information
  (req as any).clientCert = {
    subject: cert.subject,
    issuer: cert.issuer,
    valid_from: cert.valid_from,
    valid_to: cert.valid_to,
    fingerprint: cert.fingerprint,
  };

  console.log(`[Security] Client authenticated via certificate: ${cert.subject.CN}`);

  next();
}

/**
 * Security configuration summary
 */
export function getSecurityConfig() {
  return {
    httpsEnforced: process.env.NODE_ENV === 'production',
    hstsEnabled: true,
    hstsMaxAge: 31536000,
    cspEnabled: true,
    cookieSecure: process.env.NODE_ENV === 'production',
    sessionTimeout: 24 * 60 * 60 * 1000,
    rateLimiting: true,
    corsRestricted: process.env.NODE_ENV === 'production',
    certificateAuth: process.env.ENABLE_CERT_AUTH === 'true',
  };
}
