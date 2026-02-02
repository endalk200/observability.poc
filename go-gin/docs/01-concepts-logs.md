# Understanding Logs

Logs are the most familiar form of telemetry for most developers. They're timestamped records of discrete events that occurred in your system. In this chapter, we'll explore what makes logs useful for observability and how to write effective logs.

## What Are Logs?

A log is a record of an event that happened at a specific point in time. At its simplest, a log might look like this:

```
2024-01-15 10:30:45 INFO User logged in: john@example.com
```

This tells us:
- **When**: 2024-01-15 10:30:45
- **Severity**: INFO
- **What**: User logged in
- **Context**: john@example.com

## Unstructured vs Structured Logs

### Unstructured Logs (The Old Way)

Traditional logs are just text strings:

```
2024-01-15 10:30:45 INFO User john@example.com logged in from 192.168.1.1
2024-01-15 10:30:46 ERROR Failed to process order 12345: insufficient funds
2024-01-15 10:30:47 DEBUG Processing request for /api/users
```

**Problems with unstructured logs:**
- Hard to parse programmatically
- Inconsistent formats across different parts of the application
- Difficult to search and filter
- Can't easily extract specific fields

### Structured Logs (The Modern Way)

Structured logs use a consistent format (usually JSON) with defined fields:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "User logged in",
  "user_email": "john@example.com",
  "client_ip": "192.168.1.1",
  "service": "auth-service",
  "trace_id": "abc123def456"
}
```

**Benefits of structured logs:**
- Easy to parse and query
- Consistent format
- Can filter by any field (e.g., "show me all errors for user X")
- Can correlate with traces using trace_id

## Log Levels (Severity)

Log levels indicate the importance/severity of the event:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         LOG LEVELS                                    │
│              (from most to least severe)                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  FATAL/CRITICAL  ─────►  Application cannot continue                 │
│       ▼                  Example: Database connection permanently    │
│                          lost, out of memory                         │
│                                                                       │
│  ERROR  ─────────────►  Something failed, but app continues          │
│       ▼                  Example: Failed to process a request,       │
│                          external service unavailable                │
│                                                                       │
│  WARN  ──────────────►  Potential problem, worth attention           │
│       ▼                  Example: Deprecated API used, retry         │
│                          occurred, approaching rate limit            │
│                                                                       │
│  INFO  ──────────────►  Normal operations, significant events        │
│       ▼                  Example: Server started, user logged in,    │
│                          configuration loaded                        │
│                                                                       │
│  DEBUG  ─────────────►  Detailed information for debugging           │
│       ▼                  Example: Function entered, variable values, │
│                          SQL queries                                 │
│                                                                       │
│  TRACE  ─────────────►  Very detailed, step-by-step execution        │
│                          Example: Every function call, iteration     │
│                          details                                     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### When to Use Each Level

| Level | Production Logging | Use Case |
|-------|-------------------|----------|
| FATAL | Always on | System cannot recover |
| ERROR | Always on | Operation failed |
| WARN | Always on | Something unusual happened |
| INFO | Usually on | Important business events |
| DEBUG | Usually off | Troubleshooting information |
| TRACE | Off (unless debugging) | Very verbose output |

## Anatomy of a Good Log Message

A good log message should answer: **Who, What, When, Where, Why, How**

### Bad Examples

```go
// Too vague - What failed? Which user? Why?
logger.Error("Operation failed")

// No context - Which file?
logger.Info("Processing file")

// Sensitive data - Never log passwords!
logger.Debug("User login", "password", password)
```

### Good Examples

```go
// Clear and contextual
logger.Error("Failed to create user",
    "email", user.Email,
    "error", err,
    "validation_errors", validationErrors,
)

// Includes relevant context
logger.Info("File processing completed",
    "filename", file.Name,
    "size_bytes", file.Size,
    "duration_ms", elapsed.Milliseconds(),
    "records_processed", count,
)

// Actionable information
logger.Warn("Rate limit approaching",
    "current_rate", currentRate,
    "limit", rateLimit,
    "client_id", clientID,
)
```

## Log Context and Correlation

In distributed systems, a single user request might touch multiple services. To trace a request across services, you need **correlation IDs**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Request Flow                                     │
│                                                                         │
│  User Request                                                           │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ API Gateway                                                      │   │
│  │ trace_id: abc123                                                 │   │
│  │ LOG: "Received request" trace_id=abc123 user_id=42              │   │
│  └────────────────────────┬────────────────────────────────────────┘   │
│                           │                                             │
│                           ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ User Service                                                     │   │
│  │ trace_id: abc123 (propagated)                                    │   │
│  │ LOG: "Fetching user" trace_id=abc123 user_id=42                 │   │
│  └────────────────────────┬────────────────────────────────────────┘   │
│                           │                                             │
│                           ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Database                                                         │   │
│  │ trace_id: abc123 (propagated)                                    │   │
│  │ LOG: "Query executed" trace_id=abc123 query="SELECT..."         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

Now you can search for ALL logs with trace_id=abc123 to see the complete
request journey!
```

## Log Attributes

Modern logging systems support adding attributes (key-value pairs) to logs:

### Common Attributes to Include

```go
// Service identification
"service.name": "user-api"
"service.version": "1.0.0"
"environment": "production"

// Request context
"trace_id": "abc123"
"span_id": "def456"
"request_id": "req-789"

// User context (be careful with PII!)
"user.id": "42"
"tenant.id": "acme-corp"

// Operation details
"operation": "create_user"
"duration_ms": 45

// Error details
"error.type": "ValidationError"
"error.message": "Invalid email format"
```

### What NOT to Log

- Passwords and secrets
- Full credit card numbers
- Personal health information
- Social security numbers
- Session tokens or API keys

Instead, log redacted versions:
```go
logger.Info("Payment processed",
    "card_last_four", "4242",  // Not the full number
    "amount", amount,
)
```

## Log Sampling

In high-throughput systems, logging everything can be expensive. Log sampling helps:

```go
// Log only 10% of debug messages
if rand.Float64() < 0.1 {
    logger.Debug("Detailed processing info", ...)
}

// Always log errors
logger.Error("Operation failed", ...)

// Sample repetitive logs
if requestCount % 100 == 0 {
    logger.Info("Processed requests", "count", requestCount)
}
```

## Go's Standard Library: log/slog

Go 1.21 introduced `log/slog`, a structured logging package in the standard library:

```go
import "log/slog"

// Create a logger
logger := slog.Default()

// Simple logging
logger.Info("Server starting", "port", 8080)

// With error
logger.Error("Failed to connect",
    "host", "db.example.com",
    "error", err,
)

// With groups
logger.Info("User created",
    slog.Group("user",
        slog.String("id", user.ID),
        slog.String("email", user.Email),
    ),
)
```

Output:
```
2024/01/15 10:30:45 INFO Server starting port=8080
2024/01/15 10:30:45 ERROR Failed to connect host=db.example.com error="connection refused"
2024/01/15 10:30:45 INFO User created user.id=123 user.email=john@example.com
```

## Logs in OpenTelemetry

OpenTelemetry provides a way to correlate logs with traces automatically:

```go
// With OpenTelemetry, logs include trace context automatically
logger.InfoContext(ctx, "Processing request",
    "user_id", userID,
)
```

The output automatically includes trace and span IDs:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Processing request",
  "user_id": "42",
  "trace_id": "abc123def456789",
  "span_id": "123abc456def"
}
```

This allows you to:
1. See a log message
2. Click on the trace_id
3. See the complete distributed trace
4. Understand the full context of what happened

## Summary

| Concept | Description |
|---------|-------------|
| **Structured logs** | JSON/key-value format for easy parsing |
| **Log levels** | Severity classification (ERROR, WARN, INFO, etc.) |
| **Context** | Additional attributes for filtering and correlation |
| **Trace correlation** | Linking logs to distributed traces via trace_id |
| **Sampling** | Reducing log volume while maintaining visibility |

## Key Takeaways

1. **Use structured logging** - Makes logs searchable and parseable
2. **Include context** - Add relevant attributes to every log
3. **Choose the right level** - Don't spam ERROR, don't hide issues in DEBUG
4. **Correlate with traces** - Include trace_id for distributed request tracking
5. **Be security-conscious** - Never log sensitive data

---

**Previous:** [← Introduction](00-introduction.md)

**Next:** [Understanding Traces and Spans →](02-concepts-traces.md)
