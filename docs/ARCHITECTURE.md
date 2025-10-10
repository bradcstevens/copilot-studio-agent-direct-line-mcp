# Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Architecture](#component-architecture)
4. [Authentication Flow](#authentication-flow)
5. [Message Flow Sequence](#message-flow-sequence)
6. [Error Handling Architecture](#error-handling-architecture)
7. [Circuit Breaker Pattern](#circuit-breaker-pattern)
8. [Session Management](#session-management)
9. [Transport Modes](#transport-modes)
10. [Data Flow](#data-flow)

---

## Overview

The Copilot Studio Agent Direct Line MCP Server is a bridge between MCP clients (like VS Code) and Microsoft Copilot Studio Agents via the Direct Line 3.0 API. It supports two transport modes (stdio and HTTP) with optional OAuth authentication for production deployments.

### Key Design Principles

- **Thin Abstraction Layer**: Minimal logic between MCP clients and Direct Line API
- **Resilient**: Circuit breaker, retry logic, and comprehensive error handling
- **Secure**: OAuth authentication, session management, and secret masking
- **Scalable**: Multi-user support with conversation isolation
- **Observable**: Comprehensive logging, metrics, and audit trails

---

## System Architecture

```mermaid
graph TB
    subgraph "MCP Client Layer"
        VSCode[VS Code / GitHub Copilot]
        Cursor[Cursor IDE]
    end

    subgraph "Transport Layer"
        StdioTransport[Stdio Transport<br/>Local Development]
        HTTPTransport[HTTP Transport<br/>Production + OAuth]
    end

    subgraph "MCP Server Layer"
        MCPServer[Enhanced MCP Server]
        ToolHandlers[Tool Handlers<br/>- send_message<br/>- start_conversation<br/>- end_conversation<br/>- get_conversation_history]
    end

    subgraph "Authentication & Session Layer"
        EntraID[Entra ID Client<br/>OAuth 2.0 + PKCE]
        SessionMgr[Session Manager<br/>Token Lifecycle]
        SessionStore[(Session Store<br/>Memory/File)]
    end

    subgraph "Core Services Layer"
        TokenMgr[Token Manager<br/>Caching & Refresh]
        ConvMgr[Conversation Manager<br/>State & History]
        DirectLine[Direct Line Client<br/>Bot Framework API]
    end

    subgraph "Resilience Layer"
        CircuitBreaker[Circuit Breaker<br/>Failure Detection]
        RetryLogic[Retry Logic<br/>Exponential Backoff]
        HTTPClient[HTTP Client<br/>Axios + Interceptors]
    end

    subgraph "External Services"
        Azure[Azure Entra ID<br/>OAuth Provider]
        BotService[Microsoft Bot Framework<br/>Direct Line 3.0 API]
        CopilotStudio[Copilot Studio Agent]
    end

    VSCode --> StdioTransport
    Cursor --> StdioTransport

    StdioTransport --> MCPServer
    HTTPTransport --> EntraID
    HTTPTransport --> SessionMgr
    SessionMgr --> SessionStore
    EntraID --> Azure

    MCPServer --> ToolHandlers
    ToolHandlers --> ConvMgr
    ToolHandlers --> TokenMgr

    ConvMgr --> DirectLine
    TokenMgr --> DirectLine
    DirectLine --> CircuitBreaker
    CircuitBreaker --> RetryLogic
    RetryLogic --> HTTPClient
    HTTPClient --> BotService
    BotService --> CopilotStudio

    style MCPServer fill:#667eea,color:#fff
    style DirectLine fill:#667eea,color:#fff
    style EntraID fill:#f59e0b,color:#fff
    style CircuitBreaker fill:#10b981,color:#fff
```

---

## Component Architecture

```mermaid
graph LR
    subgraph "Entry Point"
        Main[index.ts<br/>Application Bootstrap]
    end

    subgraph "Server Components"
        MCPServerEnhanced[mcp-server-enhanced.ts<br/>Core MCP Implementation]
        HTTPServer[http-server.ts<br/>Express HTTP Server]
        ToolSchemas[tool-schemas.ts<br/>Zod Validation]
        MCPResponse[mcp-response.ts<br/>Response Formatting]
    end

    subgraph "Service Components"
        DirectLineClient[directline-client.ts<br/>Direct Line API Wrapper]
        TokenManager[token-manager.ts<br/>Token Cache & Refresh]
        ConversationManager[conversation-manager.ts<br/>Conversation State]
        EntraIDClient[entraid-client.ts<br/>OAuth MSAL Wrapper]
        SessionManager[session-manager.ts<br/>Session Lifecycle]
        HTTPClientSvc[http-client.ts<br/>Axios Configuration]
    end

    subgraph "Utility Components"
        CircuitBreakerUtil[circuit-breaker.ts<br/>Failure Protection]
        RetryUtil[retry.ts<br/>Backoff Strategies]
        ErrorTransformer[error-transformer.ts<br/>MCP Error Conversion]
        SecretMasking[secret-masking.ts<br/>Sensitive Data Protection]
    end

    subgraph "Type System"
        Errors[errors.ts<br/>11 Error Classes]
        DirectLineTypes[directline.ts<br/>API Types]
        SessionTypes[session.ts<br/>Auth Types]
    end

    Main --> MCPServerEnhanced
    Main --> HTTPServer
    MCPServerEnhanced --> ToolSchemas
    MCPServerEnhanced --> MCPResponse
    HTTPServer --> EntraIDClient
    HTTPServer --> SessionManager

    MCPServerEnhanced --> ConversationManager
    MCPServerEnhanced --> TokenManager
    ConversationManager --> DirectLineClient
    TokenManager --> DirectLineClient

    DirectLineClient --> CircuitBreakerUtil
    DirectLineClient --> HTTPClientSvc
    HTTPClientSvc --> RetryUtil
    
    MCPResponse --> ErrorTransformer
    ErrorTransformer --> Errors

    EntraIDClient --> SessionTypes
    SessionManager --> SessionTypes
    DirectLineClient --> DirectLineTypes

    style MCPServerEnhanced fill:#667eea,color:#fff
    style DirectLineClient fill:#667eea,color:#fff
    style CircuitBreakerUtil fill:#10b981,color:#fff
```

---

## Authentication Flow

### HTTP Mode with OAuth 2.0 + PKCE

```mermaid
sequenceDiagram
    participant Client as MCP Client<br/>(VS Code)
    participant MCP as MCP Server<br/>(HTTP Mode)
    participant Entra as Azure Entra ID
    participant Browser as User Browser
    
    Note over Client,Entra: OAuth 2.0 Authorization Code Flow with PKCE
    
    Client->>MCP: GET /authorize?redirect_uri=...&state=...
    MCP->>MCP: Generate PKCE code_verifier & code_challenge
    MCP->>MCP: Store state in session
    MCP->>Browser: Redirect to Azure Entra ID<br/>authorization endpoint
    
    Browser->>Entra: GET /authorize?client_id=...&code_challenge=...
    Entra->>Browser: Show Microsoft Sign-In Page
    Browser->>Entra: User authenticates (username/password + MFA)
    Entra->>Browser: Redirect with authorization code
    
    Browser->>MCP: GET /auth/callback?code=...&state=...
    MCP->>MCP: Validate state parameter
    MCP->>Entra: POST /token<br/>(code + code_verifier + client_secret)
    Entra->>MCP: Access token + Refresh token + ID token
    
    MCP->>MCP: Create session with tokens
    MCP->>MCP: Store session (SessionManager)
    MCP->>Browser: Redirect to client callback<br/>with session token
    
    Browser->>Client: Pass session token
    Client->>MCP: MCP requests with<br/>Bearer token
    MCP->>MCP: Validate session token
    MCP->>Client: Authorized response
    
    Note over Client,MCP: Token Refresh (before expiry)
    Client->>MCP: POST /auth/refresh
    MCP->>Entra: POST /token<br/>(refresh_token grant)
    Entra->>MCP: New access token
    MCP->>MCP: Update session tokens
    MCP->>Client: Success
```

### Stdio Mode (No Authentication)

```mermaid
sequenceDiagram
    participant Client as MCP Client<br/>(VS Code Local)
    participant MCP as MCP Server<br/>(Stdio Mode)
    participant DirectLine as Direct Line API
    
    Note over Client,DirectLine: Direct communication - No user authentication
    
    Client->>MCP: Start MCP Server via stdio
    MCP->>MCP: Load DIRECT_LINE_SECRET from env
    MCP->>DirectLine: Generate token (using secret)
    DirectLine->>MCP: Return token
    
    Client->>MCP: MCP Tool Call (no auth required)
    MCP->>DirectLine: API Request (with token)
    DirectLine->>MCP: Response
    MCP->>Client: Tool Result
```

---

## Message Flow Sequence

### Complete Conversation Flow

```mermaid
sequenceDiagram
    participant User as GitHub Copilot<br/>(MCP Client)
    participant MCP as MCP Server<br/>Enhanced
    participant Token as Token Manager
    participant Conv as Conversation<br/>Manager
    participant CB as Circuit Breaker
    participant DL as Direct Line<br/>Client
    participant Bot as Copilot Studio<br/>Agent
    
    Note over User,Bot: 1. Start Conversation
    User->>MCP: start_conversation(initialMessage)
    MCP->>Token: getToken(clientId)
    
    alt Token Cached
        Token->>Token: Check cache validity
        Token-->>MCP: Return cached token
    else Token Expired/Missing
        Token->>DL: generateToken()
        DL->>CB: Execute with circuit breaker
        CB->>Bot: POST /tokens/generate
        Bot-->>CB: Token response
        CB-->>DL: Success
        DL-->>Token: Token data
        Token->>Token: Cache token + schedule refresh
        Token-->>MCP: New token
    end
    
    MCP->>Conv: createConversation(clientId, token)
    Conv->>DL: startConversation(token)
    DL->>CB: Execute with circuit breaker
    CB->>Bot: POST /conversations
    Bot-->>CB: Conversation created
    CB-->>DL: Success
    DL-->>Conv: Conversation details
    Conv->>Conv: Store conversation state<br/>(id, token, clientId, watermark)
    Conv->>Conv: Schedule idle timeout cleanup (30 min)
    Conv-->>MCP: Conversation state
    
    alt Initial Message Provided
        MCP->>DL: sendActivity(conversationId, message, token)
        DL->>CB: Execute with circuit breaker
        CB->>Bot: POST /conversations/{id}/activities
        Bot-->>CB: Activity ID
        CB-->>DL: Success
        DL-->>MCP: Activity ID
        
        MCP->>MCP: Poll for bot response (30s timeout)
        loop Every 1 second (max 30 iterations)
            MCP->>DL: getActivities(conversationId, watermark, token)
            DL->>CB: Execute with circuit breaker
            CB->>Bot: GET /conversations/{id}/activities
            Bot-->>CB: Activity set
            CB-->>DL: Success
            DL-->>MCP: Activities + watermark
            MCP->>Conv: updateWatermark(conversationId, watermark)
            
            alt Bot Response Found
                MCP->>Conv: addToHistory(conversationId, activities)
                MCP->>MCP: Extract bot message
                MCP-->>User: Conversation + Response
            else No Response Yet
                MCP->>MCP: Wait 1 second, continue polling
            end
        end
    else No Initial Message
        MCP-->>User: Conversation started (no message)
    end
    
    Note over User,Bot: 2. Send Message
    User->>MCP: send_message(message, conversationId)
    MCP->>Conv: getConversation(conversationId)
    Conv->>Conv: Validate conversation exists
    Conv->>Conv: Update lastActivity timestamp
    Conv->>Conv: Reschedule idle timeout
    Conv-->>MCP: Conversation state
    
    MCP->>DL: sendActivity(conversationId, message, token)
    DL->>CB: Execute with circuit breaker
    
    alt Circuit Breaker CLOSED
        CB->>Bot: POST /conversations/{id}/activities
        Bot-->>CB: Activity ID
        CB->>CB: Record success
        CB-->>DL: Success
    else Circuit Breaker OPEN
        CB-->>DL: Fail fast (CircuitBreakerError)
        DL-->>MCP: Error
        MCP->>MCP: Transform to MCP error
        MCP-->>User: Error response
    end
    
    DL-->>MCP: Activity ID
    
    Note over MCP: Poll for bot response
    MCP->>DL: getActivities(conversationId, watermark, token)
    DL->>CB: Execute with circuit breaker
    CB->>Bot: GET /conversations/{id}/activities
    Bot-->>CB: Activity set with bot responses
    CB-->>DL: Success
    DL-->>MCP: Activities
    MCP->>Conv: updateWatermark + addToHistory
    MCP->>MCP: Extract bot message
    MCP-->>User: Message sent + Bot response
    
    Note over User,Bot: 3. Get Conversation History
    User->>MCP: get_conversation_history(conversationId, limit)
    MCP->>Conv: getConversation(conversationId)
    Conv-->>MCP: Conversation state
    MCP->>MCP: Format message history (apply limit)
    MCP-->>User: Message history array
    
    Note over User,Bot: 4. End Conversation
    User->>MCP: end_conversation(conversationId)
    MCP->>Conv: endConversation(conversationId)
    Conv->>Conv: Clear idle timeout timer
    Conv->>Conv: Delete conversation state
    Conv->>Conv: Update metrics
    Conv-->>MCP: Cleanup complete
    MCP-->>User: Conversation ended
```

---

## Error Handling Architecture

### Error Hierarchy and Flow

```mermaid
graph TD
    subgraph "Error Classification"
        BaseError[ApplicationError<br/>Base Error Class]
        
        AuthErr[AuthenticationError<br/>401 Unauthorized]
        AuthzErr[AuthorizationError<br/>403 Forbidden]
        OAuthErr[OAuthError<br/>OAuth Failures]
        TokenErr[TokenRefreshError<br/>Token Renewal Failed]
        
        NetErr[NetworkError<br/>ECONNRESET, ETIMEDOUT]
        TimeoutErr[TimeoutError<br/>Request Timeout]
        RateLimitErr[RateLimitError<br/>429 Rate Limit]
        ServiceErr[ServiceUnavailableError<br/>503 Service Down]
        
        CBErr[CircuitBreakerError<br/>Circuit Open]
        ConfigErr[ConfigurationError<br/>Config Issues]
        ValidationErr[ValidationError<br/>Invalid Input]
        
        BaseError --> AuthErr
        BaseError --> AuthzErr
        BaseError --> OAuthErr
        BaseError --> TokenErr
        BaseError --> NetErr
        BaseError --> TimeoutErr
        BaseError --> RateLimitErr
        BaseError --> ServiceErr
        BaseError --> CBErr
        BaseError --> ConfigErr
        BaseError --> ValidationErr
    end
    
    subgraph "Error Context"
        Context[Error Context<br/>category, severity, retryable]
        RetryStrategy[Retry Strategy<br/>maxRetries, delays, backoff]
        UserMessage[User-Friendly Message]
        RecoveryAction[Recovery Action]
        Metadata[Additional Metadata]
        
        Context --> RetryStrategy
        Context --> UserMessage
        Context --> RecoveryAction
        Context --> Metadata
    end
    
    subgraph "Error Transformation"
        MCPError[MCP Error Format<br/>code, message, data]
        ErrorTransformer[Error Transformer<br/>converts to MCP]
    end
    
    BaseError --> Context
    BaseError --> ErrorTransformer
    ErrorTransformer --> MCPError
    
    style BaseError fill:#dc3545,color:#fff
    style OAuthErr fill:#f59e0b,color:#fff
    style NetErr fill:#f59e0b,color:#fff
    style CBErr fill:#dc3545,color:#fff
    style MCPError fill:#667eea,color:#fff
```

### Error Handling Flow

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant MCP as MCP Server
    participant CB as Circuit Breaker
    participant Retry as Retry Logic
    participant API as Direct Line API
    
    Client->>MCP: Tool Call
    MCP->>CB: execute(() => apiCall())
    
    alt Circuit CLOSED or HALF_OPEN
        CB->>Retry: executeWithRetry()
        
        loop Retry Attempts (max 3)
            Retry->>API: HTTP Request
            
            alt Success Response
                API-->>Retry: 200 OK
                Retry-->>CB: Success
                CB->>CB: Record success<br/>Reset failure count
                CB-->>MCP: Result
                MCP-->>Client: Success Response
            else Retryable Error (Network, 5xx, Timeout)
                API-->>Retry: Error
                Retry->>Retry: Classify error
                Retry->>Retry: Calculate backoff delay<br/>(exponential with jitter)
                Retry->>Retry: Wait (1s → 2s → 4s)
                alt Max Retries Not Reached
                    Note over Retry: Retry attempt
                else Max Retries Reached
                    Retry-->>CB: Final Error
                    CB->>CB: classifyFailure(error)
                    
                    alt Failure Counts Toward Circuit
                        CB->>CB: Increment failure count
                        alt Failure Threshold Reached (5 in 30s)
                            CB->>CB: Transition to OPEN state
                            Note over CB: Circuit opens for 60s
                        end
                    else Excluded Failure (Auth, Validation)
                        CB->>CB: Don't count toward circuit
                    end
                    
                    CB-->>MCP: Error
                    MCP->>MCP: transformErrorToMCP()
                    MCP-->>Client: MCP Error Response
                end
            else Non-Retryable Error (401, 403, 400)
                API-->>Retry: Error
                Retry->>Retry: Classify as non-retryable
                Retry-->>CB: Error (no retry)
                CB->>CB: classifyFailure(error)
                CB->>CB: Don't count (excluded type)
                CB-->>MCP: Error
                MCP->>MCP: transformErrorToMCP()
                MCP-->>Client: MCP Error Response
            end
        end
    else Circuit OPEN
        CB-->>MCP: CircuitBreakerError<br/>(fail fast)
        MCP->>MCP: transformErrorToMCP()
        MCP-->>Client: Circuit Open Error
        
        Note over CB: Wait for recovery timeout (60s)
        CB->>CB: Transition to HALF_OPEN
        Note over CB: Next request will test service
    end
```

---

## Circuit Breaker Pattern

### State Machine

```mermaid
stateDiagram-v2
    [*] --> CLOSED: Initial State
    
    CLOSED --> OPEN: Failure threshold reached<br/>(5 failures in 30s window)
    OPEN --> HALF_OPEN: Recovery timeout elapsed<br/>(60 seconds)
    HALF_OPEN --> CLOSED: Success threshold reached<br/>(3 consecutive successes)
    HALF_OPEN --> OPEN: Any failure occurs
    CLOSED --> CLOSED: Success or<br/>Excluded failure type
    HALF_OPEN --> HALF_OPEN: Success (counting toward threshold)
    
    note right of CLOSED
        Normal Operation
        - All requests pass through
        - Failures counted in sliding window
        - Excludes auth/validation errors
    end note
    
    note right of OPEN
        Fail Fast Mode
        - Immediately reject requests
        - Return CircuitBreakerError
        - Wait for recovery timeout
        - Prevents cascading failures
    end note
    
    note right of HALF_OPEN
        Testing Recovery
        - Allow limited requests through
        - Count successes toward threshold
        - Single failure reopens circuit
    end note
```

### Failure Classification

```mermaid
graph TD
    Error[Error Occurs] --> Classify{Classify<br/>Failure Type}
    
    Classify -->|Network Issues| Network[NETWORK<br/>ECONNRESET, ETIMEDOUT]
    Classify -->|Request Timeout| Timeout[TIMEOUT<br/>Request exceeded time limit]
    Classify -->|Server Error| Server[SERVER_ERROR<br/>5xx Status Codes]
    Classify -->|OAuth/Auth Service| AuthService[AUTH_SERVICE<br/>OAuth failures, token issues]
    Classify -->|Rate Limiting| RateLimit[RATE_LIMIT<br/>429 Status]
    Classify -->|Unknown| Unknown[UNKNOWN<br/>Unclassified errors]
    
    Network --> CountYes{Count Toward<br/>Circuit?}
    Timeout --> CountYes
    Server --> CountYes
    RateLimit --> CountYes
    Unknown --> CountYes
    
    AuthService --> CountNo{Count Toward<br/>Circuit?}
    
    CountYes -->|Yes| Increment[Increment Failure Count<br/>Add to sliding window]
    CountNo -->|No| Exclude[Exclude from count<br/>Don't affect circuit state]
    
    Increment --> CheckThreshold{Threshold<br/>Reached?}
    CheckThreshold -->|Yes| Open[Open Circuit]
    CheckThreshold -->|No| Continue[Continue Monitoring]
    
    style Network fill:#f59e0b,color:#fff
    style Timeout fill:#f59e0b,color:#fff
    style Server fill:#dc3545,color:#fff
    style AuthService fill:#667eea,color:#fff
    style Open fill:#dc3545,color:#fff
```

---

## Session Management

### Session Lifecycle (HTTP Mode)

```mermaid
sequenceDiagram
    participant User as User Browser
    participant HTTP as HTTP Server
    participant Session as Session Manager
    participant Store as Session Store<br/>(Memory/File)
    participant Entra as Azure Entra ID
    
    Note over User,Entra: 1. Session Creation
    User->>HTTP: OAuth callback with auth code
    HTTP->>Entra: Exchange code for tokens
    Entra-->>HTTP: Access + Refresh + ID tokens
    
    HTTP->>Session: createSession(userContext, tokens, security)
    Session->>Session: Generate sessionId (UUID)
    Session->>Session: Generate sessionToken (random 64 bytes)
    Session->>Store: save(sessionId, sessionData)
    Store-->>Session: Success
    Session-->>HTTP: sessionId + sessionToken
    
    HTTP->>HTTP: Store in Express session cookie
    HTTP-->>User: Set-Cookie: mcp.sid=...
    
    Note over User,Store: 2. Session Validation
    User->>HTTP: Request with session cookie
    HTTP->>HTTP: Extract sessionId + token from cookie
    HTTP->>Session: validateSession(sessionId, token, ip, userAgent)
    Session->>Store: get(sessionId)
    Store-->>Session: Session data
    
    Session->>Session: Validate session token
    Session->>Session: Check expiration (24h)
    Session->>Session: Verify security (IP, user agent)
    
    alt Token Expiring Soon (< 5 min)
        Session-->>HTTP: valid=true, requiresRefresh=true
        HTTP->>Entra: POST /token (refresh_token grant)
        Entra-->>HTTP: New access token
        HTTP->>Session: updateSession(sessionId, newTokens)
        Session->>Store: update(sessionId, sessionData)
    else Token Valid
        Session-->>HTTP: valid=true, requiresRefresh=false
    else Session Invalid
        Session-->>HTTP: valid=false
        HTTP-->>User: 401 Unauthorized
    end
    
    Session->>Session: Update lastAccessedAt + accessCount
    Session->>Store: update(sessionId, sessionData)
    HTTP-->>User: Authorized Response
    
    Note over User,Store: 3. Session Termination
    User->>HTTP: POST /auth/logout
    HTTP->>Session: terminateSession(sessionId)
    Session->>Store: delete(sessionId)
    Store-->>Session: Success
    Session-->>HTTP: Success
    HTTP->>HTTP: Destroy Express session
    HTTP-->>User: Logged out
    
    Note over Store: 4. Cleanup Process (Background)
    Store->>Store: Periodic cleanup task (every 1 hour)
    Store->>Store: Scan for expired sessions
    Store->>Store: Delete sessions older than 24h
```

### Session Store Types

```mermaid
graph TB
    subgraph "Session Store Interface"
        IStore[ISessionStore<br/>Interface]
    end
    
    subgraph "Memory Store"
        MemStore[MemorySessionStore<br/>In-Memory Map]
        MemData[("In-Memory<br/>Map&lt;sessionId, data&gt;")]
        MemStore --> MemData
    end
    
    subgraph "File Store"
        FileStore[FileSessionStore<br/>Encrypted Files]
        FileSystem[("File System<br/>.sessions/*.json")]
        FileStore --> FileSystem
        FileStore -.->|Encryption| Crypto[AES-256-GCM<br/>Encrypted]
    end
    
    subgraph "Future Stores (Extensible)"
        RedisStore[RedisSessionStore<br/>Distributed Cache]
        RedisDB[("Redis<br/>Cluster")]
        RedisStore --> RedisDB
        
        DatabaseStore[DatabaseSessionStore<br/>Persistent Storage]
        PostgreSQL[("PostgreSQL<br/>Database")]
        DatabaseStore --> PostgreSQL
    end
    
    IStore -.->|Implements| MemStore
    IStore -.->|Implements| FileStore
    IStore -.->|Can Implement| RedisStore
    IStore -.->|Can Implement| DatabaseStore
    
    style IStore fill:#667eea,color:#fff
    style MemStore fill:#10b981,color:#fff
    style FileStore fill:#10b981,color:#fff
```

---

## Transport Modes

### Stdio Transport (Local Development)

```mermaid
graph LR
    subgraph "VS Code Process"
        VSCode[VS Code<br/>MCP Client]
        GitHubCopilot[GitHub Copilot<br/>Extension]
    end
    
    subgraph "Node.js Process"
        MCPServer[MCP Server<br/>stdio transport]
        stdin[stdin<br/>JSON-RPC]
        stdout[stdout<br/>JSON-RPC]
    end
    
    subgraph "External Services"
        DirectLine[Direct Line API]
        Bot[Copilot Studio Agent]
    end
    
    GitHubCopilot --> VSCode
    VSCode -->|Write JSON-RPC| stdin
    stdin --> MCPServer
    MCPServer -->|Write JSON-RPC| stdout
    stdout --> VSCode
    
    MCPServer -->|HTTPS| DirectLine
    DirectLine -->|Bot Protocol| Bot
    
    style MCPServer fill:#667eea,color:#fff
    style stdin fill:#10b981,color:#fff
    style stdout fill:#10b981,color:#fff
```

### HTTP Transport (Production)

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser<br/>OAuth Flow]
        MCPClient[MCP Client<br/>Remote Connection]
    end
    
    subgraph "HTTP Server Layer"
        Express[Express.js HTTP Server]
        OAuth[OAuth Routes<br/>/auth/*]
        MCPEndpoint[MCP Endpoints<br/>/mcp]
        Middleware[Middleware Stack<br/>- Helmet Security<br/>- CORS<br/>- Rate Limiting<br/>- Session Auth]
    end

    subgraph "MCP Server Layer"
        MCPServerHTTP[Enhanced MCP Server<br/>HTTP POST Transport]
    end
    
    subgraph "Services"
        EntraID[Entra ID Client]
        SessionMgr[Session Manager]
        DirectLine[Direct Line Client]
    end
    
    Browser -->|1. GET /auth/login| OAuth
    OAuth -->|2. Redirect| EntraID
    EntraID -->|3. User authenticates| EntraID
    EntraID -->|4. Callback with code| OAuth
    OAuth -->|5. Exchange tokens| EntraID
    OAuth -->|6. Create session| SessionMgr
    
    MCPClient -->|Bearer Token| Middleware
    Middleware -->|Validate| SessionMgr
    Middleware -->|Authorized| MCPEndpoint
    MCPEndpoint -->|HTTP POST| MCPServerHTTP

    MCPServerHTTP --> DirectLine
    
    style Express fill:#667eea,color:#fff
    style MCPServerHTTP fill:#667eea,color:#fff
    style EntraID fill:#f59e0b,color:#fff
```

---

## Data Flow

### Token Management Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant TM as Token Manager
    participant Cache as Token Cache<br/>(In-Memory)
    participant DL as Direct Line API
    
    Note over App,DL: Initial Token Request
    App->>TM: getToken(clientId)
    TM->>Cache: Check cache[clientId]
    Cache-->>TM: Cache miss
    
    TM->>DL: POST /tokens/generate
    DL-->>TM: token + expires_in + conversationId
    
    TM->>Cache: Store token entry<br/>(token, expiresAt, createdAt)
    TM->>TM: Schedule proactive refresh<br/>(expires_in - 5 minutes)
    TM-->>App: Token
    
    Note over App,DL: Cached Token Request
    App->>TM: getToken(clientId)
    TM->>Cache: Check cache[clientId]
    Cache-->>TM: Token entry found
    TM->>TM: Validate expiration
    
    alt Token Valid
        TM-->>App: Cached token
    else Token Expired
        TM->>DL: POST /tokens/generate
        DL-->>TM: New token
        TM->>Cache: Update cache
        TM->>TM: Schedule refresh
        TM-->>App: New token
    end
    
    Note over TM,DL: Proactive Refresh (Background)
    TM->>TM: Refresh timer triggers<br/>(5 min before expiry)
    TM->>DL: POST /tokens/generate
    DL-->>TM: New token
    TM->>Cache: Update cache
    TM->>TM: Schedule next refresh
    
    Note over Cache: Token never expires to user
```

### Conversation State Management

```mermaid
stateDiagram-v2
    [*] --> Created: createConversation()
    
    Created --> Active: First activity sent
    Active --> Active: Send/receive messages<br/>Update lastActivity<br/>Reset idle timer
    
    Active --> Idle: No activity for 30 minutes
    Idle --> [*]: Auto-cleanup
    
    Active --> Ended: endConversation() called
    Ended --> [*]: Cleanup resources
    
    note right of Created
        State Initialization
        - conversationId
        - token
        - clientId
        - watermark (undefined)
        - createdAt
        - lastActivity
        - messageHistory []
        - Schedule 30min timeout
    end note
    
    note right of Active
        Active Conversation
        - Track watermark for polling
        - Buffer message history
        - Update timestamps
        - Reschedule timeout on activity
    end note
    
    note right of Ended
        Cleanup Actions
        - Clear timeout timer
        - Remove from conversations map
        - Update metrics
        - Log lifetime
    end note
```

### Message Polling Strategy

```mermaid
graph TD
    Start[Send Activity] --> Poll[Start Polling Loop]
    Poll --> Wait[Wait 1 second]
    Wait --> GetActivities[GET /activities?watermark=X]
    GetActivities --> FilterBot{Bot messages<br/>in response?}
    
    FilterBot -->|Yes| UpdateWatermark[Update watermark]
    UpdateWatermark --> AddHistory[Add to message history]
    AddHistory --> Return[Return bot response]
    
    FilterBot -->|No| CheckTimeout{Timeout<br/>reached?<br/>30 seconds}
    CheckTimeout -->|No| Wait
    CheckTimeout -->|Yes| TimeoutMsg[Return timeout message]
    
    Return --> End[End]
    TimeoutMsg --> End
    
    style Start fill:#667eea,color:#fff
    style FilterBot fill:#f59e0b,color:#000
    style Return fill:#10b981,color:#fff
```

---

## Additional Diagrams

### Retry Strategy with Exponential Backoff

```mermaid
graph TD
    Request[API Request] --> Try1{Attempt 1}
    Try1 -->|Success| Success[Return Result]
    Try1 -->|Fail| Classify1{Retryable?}
    
    Classify1 -->|No| NoRetry[Throw Error]
    Classify1 -->|Yes| Wait1[Wait 1s + jitter]
    
    Wait1 --> Try2{Attempt 2}
    Try2 -->|Success| Success
    Try2 -->|Fail| Classify2{Retryable?}
    
    Classify2 -->|No| NoRetry
    Classify2 -->|Yes| Wait2[Wait 2s + jitter]
    
    Wait2 --> Try3{Attempt 3}
    Try3 -->|Success| Success
    Try3 -->|Fail| Classify3{Retryable?}
    
    Classify3 -->|No| NoRetry
    Classify3 -->|Yes| Wait3[Wait 4s + jitter]
    
    Wait3 --> Try4{Attempt 4<br/>Final}
    Try4 -->|Success| Success
    Try4 -->|Fail| FinalFail[Throw Final Error]
    
    style Success fill:#10b981,color:#fff
    style NoRetry fill:#dc3545,color:#fff
    style FinalFail fill:#dc3545,color:#fff
```

### User Isolation in Multi-Tenant Mode

```mermaid
graph TB
    subgraph "User A"
        UserA[User A Session]
        ConvA1[Conversation 1]
        ConvA2[Conversation 2]
        UserA --> ConvA1
        UserA --> ConvA2
    end
    
    subgraph "User B"
        UserB[User B Session]
        ConvB1[Conversation 1]
        ConvB2[Conversation 2]
        UserB --> ConvB1
        UserB --> ConvB2
    end
    
    subgraph "User C"
        UserC[User C Session]
        ConvC1[Conversation 1]
        UserC --> ConvC1
    end
    
    subgraph "MCP Server"
        MCPServer[Enhanced MCP Server]
        UserConvMap[User-Conversation Mapping<br/>Map&lt;userId, Set&lt;conversationIds&gt;&gt;]
        ConvManager[Conversation Manager<br/>Map&lt;conversationId, ConversationState&gt;]
        AuditLog[Audit Log<br/>All actions tracked with userId]
    end
    
    UserA -.->|Isolated| MCPServer
    UserB -.->|Isolated| MCPServer
    UserC -.->|Isolated| MCPServer
    
    MCPServer --> UserConvMap
    MCPServer --> ConvManager
    MCPServer --> AuditLog
    
    UserConvMap -.->|Validates Access| ConvManager
    
    style UserA fill:#667eea,color:#fff
    style UserB fill:#10b981,color:#fff
    style UserC fill:#f59e0b,color:#fff
    style MCPServer fill:#dc3545,color:#fff
```

---

## Summary

This architecture provides:

1. **Flexibility**: Supports both local development (stdio) and production deployment (HTTP + OAuth)
2. **Resilience**: Circuit breaker, retry logic, and comprehensive error handling prevent cascading failures
3. **Security**: OAuth 2.0 with PKCE, session management, secret masking, and user isolation
4. **Scalability**: Multi-user support with conversation isolation and session management
5. **Observability**: Metrics, audit logs, and comprehensive logging throughout
6. **Maintainability**: Clean separation of concerns, type-safe implementation, and extensible design

The system is designed as a thin, reliable bridge between MCP clients and Copilot Studio Agents, handling the complexities of authentication, token management, and error handling while keeping the core interaction logic simple and focused.
