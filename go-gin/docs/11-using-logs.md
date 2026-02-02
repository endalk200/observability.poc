# Using Logs in Go Code

This chapter covers how to write effective, structured logs in your Go code using the OpenTelemetry-integrated `slog` logger. You'll learn to create context-aware logs that correlate with traces.

## Creating a Logger

Use the OTel slog bridge to create a logger:

```go
import "go.opentelemetry.io/contrib/bridges/otelslog"

// Create a logger (usually done once at startup)
logger := otelslog.NewLogger("my-service")
```

This logger:
- Sends logs to the configured OTel LoggerProvider
- Automatically includes trace context when using `*Context` methods
- Works with all standard `slog` patterns

## Basic Logging

### Standard Log Methods

```go
// Info level
logger.Info("Server started", "port", 8080)

// Error level
logger.Error("Failed to connect", "error", err)

// Warning level
logger.Warn("Rate limit approaching", "current", 95, "limit", 100)

// Debug level
logger.Debug("Processing item", "item_id", itemID)
```

### Output Format

The log output looks like:
```json
{
    "timestamp": "2024-01-15T10:30:45.123Z",
    "severity": "INFO",
    "body": "Server started",
    "attributes": {
        "port": 8080
    }
}
```

## Context-Aware Logging (Critical!)

**Always use `*Context` methods** to include trace correlation:

```go
func HandleRequest(ctx context.Context, userID string) {
    // ✅ GOOD - includes trace_id and span_id
    logger.InfoContext(ctx, "Processing request",
        "user_id", userID,
    )
    
    // ❌ BAD - no trace correlation
    logger.Info("Processing request",
        "user_id", userID,
    )
}
```

### Why Context Matters

With context:
```json
{
    "timestamp": "2024-01-15T10:30:45.123Z",
    "severity": "INFO",
    "body": "Processing request",
    "attributes": {
        "user_id": "42"
    },
    "trace_id": "abc123def456789",
    "span_id": "123abc456def"
}
```

Without context:
```json
{
    "timestamp": "2024-01-15T10:30:45.123Z",
    "severity": "INFO",
    "body": "Processing request",
    "attributes": {
        "user_id": "42"
    }
}
```

The `trace_id` lets you find all logs for a single request across your entire system!

## Structured Attributes

### Key-Value Pairs

```go
logger.InfoContext(ctx, "Order placed",
    "order_id", order.ID,
    "user_id", order.UserID,
    "total", order.Total,
    "items_count", len(order.Items),
)
```

### Typed Attributes

For more control, use `slog` attribute types:

```go
import "log/slog"

logger.InfoContext(ctx, "User created",
    slog.String("user_id", user.ID),
    slog.String("email", user.Email),
    slog.Int("age", user.Age),
    slog.Bool("verified", user.Verified),
    slog.Float64("balance", user.Balance),
    slog.Time("created_at", user.CreatedAt),
    slog.Duration("session_length", sessionDuration),
)
```

### Grouped Attributes

Group related attributes:

```go
logger.InfoContext(ctx, "Request completed",
    slog.Group("request",
        slog.String("method", r.Method),
        slog.String("path", r.URL.Path),
        slog.String("client_ip", r.RemoteAddr),
    ),
    slog.Group("response",
        slog.Int("status", status),
        slog.Int("bytes", bytesWritten),
    ),
    slog.Group("timing",
        slog.Duration("total", totalDuration),
        slog.Duration("db", dbDuration),
    ),
)
```

Output:
```json
{
    "body": "Request completed",
    "attributes": {
        "request": {
            "method": "GET",
            "path": "/users/42",
            "client_ip": "192.168.1.1"
        },
        "response": {
            "status": 200,
            "bytes": 1234
        },
        "timing": {
            "total": "52ms",
            "db": "45ms"
        }
    }
}
```

## Log Levels

Use appropriate levels:

```go
// DEBUG - Detailed information for debugging
// Only enable in development or when troubleshooting
logger.DebugContext(ctx, "Cache lookup",
    "key", cacheKey,
    "ttl", ttl,
)

// INFO - Normal operations, significant events
logger.InfoContext(ctx, "User logged in",
    "user_id", userID,
)

// WARN - Potential issues, not errors but worth attention
logger.WarnContext(ctx, "Rate limit reached",
    "client_id", clientID,
    "limit", rateLimit,
)

// ERROR - Errors that need attention
logger.ErrorContext(ctx, "Failed to process payment",
    "order_id", orderID,
    "error", err,
)
```

### Level Guidelines

| Level | When to Use | Example |
|-------|-------------|---------|
| DEBUG | Development troubleshooting | Variable values, function entry/exit |
| INFO | Normal business operations | User actions, state changes |
| WARN | Potential problems | Approaching limits, deprecated usage |
| ERROR | Failures requiring attention | Unhandled errors, failed operations |

## Real-World Example from Our Codebase

Here's how we use logging in the User API:

```go
// main.go

func main() {
    ctx := context.Background()
    
    // Initialize OpenTelemetry
    otelShutdown, err := initOtel(ctx)
    if err != nil {
        log.Fatalf("Failed to initialize OpenTelemetry: %v", err)
    }
    defer otelShutdown(ctx)
    
    // Create logger using OTel bridge
    logger := otelslog.NewLogger(serviceName)
    logger.Info("Starting User API server")
    
    // Initialize storage
    dataPath := getEnv("DATA_PATH", "./data/users.json")
    store, err := storage.NewJSONStore(dataPath)
    if err != nil {
        logger.Error("Failed to initialize storage", "error", err)
        os.Exit(1)
    }
    logger.Info("Storage initialized", "path", dataPath)
    
    // ... rest of setup
}

// Logging middleware
func loggingMiddleware(logger *slog.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        ctx := c.Request.Context()
        
        // Log request (includes trace context from otelgin middleware)
        logger.InfoContext(ctx, "Incoming request",
            "method", c.Request.Method,
            "path", c.Request.URL.Path,
            "client_ip", c.ClientIP(),
        )

        c.Next()

        // Log response
        logger.InfoContext(ctx, "Request completed",
            "method", c.Request.Method,
            "path", c.Request.URL.Path,
            "status", c.Writer.Status(),
        )
    }
}
```

### In Handlers

```go
// handlers/user.go

func (h *UserHandler) GetByID(c *gin.Context) {
    ctx := c.Request.Context()
    
    id := c.Param("id")
    h.logger.InfoContext(ctx, "Fetching user by ID", "user_id", id)

    user, err := h.store.GetByID(id)
    if err != nil {
        if errors.Is(err, storage.ErrUserNotFound) {
            h.logger.WarnContext(ctx, "User not found", "user_id", id)
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        h.logger.ErrorContext(ctx, "Failed to fetch user",
            "user_id", id,
            "error", err,
        )
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
        return
    }

    h.logger.InfoContext(ctx, "Successfully fetched user", "user_id", id)
    c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Create(c *gin.Context) {
    ctx := c.Request.Context()
    
    var req models.CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        h.logger.WarnContext(ctx, "Invalid request body", "error", err)
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    h.logger.InfoContext(ctx, "Creating new user",
        "name", req.Name,
        "email", req.Email,
    )
    
    // ... create user ...
    
    h.logger.InfoContext(ctx, "Successfully created user", "user_id", user.ID)
    c.JSON(http.StatusCreated, user)
}
```

## Common Patterns

### Pattern 1: Error Logging

Always include error details:

```go
func processOrder(ctx context.Context, orderID string) error {
    order, err := fetchOrder(ctx, orderID)
    if err != nil {
        logger.ErrorContext(ctx, "Failed to fetch order",
            "order_id", orderID,
            "error", err,
            "error_type", fmt.Sprintf("%T", err),
        )
        return fmt.Errorf("fetch order: %w", err)
    }
    
    if err := validateOrder(order); err != nil {
        logger.WarnContext(ctx, "Order validation failed",
            "order_id", orderID,
            "validation_error", err,
        )
        return fmt.Errorf("validate order: %w", err)
    }
    
    return nil
}
```

### Pattern 2: Operation Lifecycle

Log start and end of operations:

```go
func syncData(ctx context.Context) error {
    logger.InfoContext(ctx, "Starting data sync")
    start := time.Now()
    
    count, err := performSync(ctx)
    duration := time.Since(start)
    
    if err != nil {
        logger.ErrorContext(ctx, "Data sync failed",
            "duration_ms", duration.Milliseconds(),
            "error", err,
        )
        return err
    }
    
    logger.InfoContext(ctx, "Data sync completed",
        "records_synced", count,
        "duration_ms", duration.Milliseconds(),
    )
    return nil
}
```

### Pattern 3: Conditional Logging

For expensive-to-compute log data:

```go
// Only compute if debug is enabled
if logger.Enabled(ctx, slog.LevelDebug) {
    details := computeExpensiveDetails()
    logger.DebugContext(ctx, "Detailed state",
        "details", details,
    )
}
```

### Pattern 4: Logger with Default Attributes

Create child loggers with preset attributes:

```go
// Create logger with default service info
serviceLogger := logger.With(
    "service", "user-api",
    "version", "1.0.0",
)

// Now all logs include service info
serviceLogger.InfoContext(ctx, "Processing request")
// Output includes: service=user-api, version=1.0.0

// Create request-scoped logger
requestLogger := serviceLogger.With(
    "request_id", requestID,
    "user_id", userID,
)

// All logs in this request include request context
requestLogger.InfoContext(ctx, "Validating input")
requestLogger.InfoContext(ctx, "Saving to database")
```

### Pattern 5: Audit Logging

For compliance and security:

```go
func auditLog(ctx context.Context, action string, resource string, details map[string]any) {
    attrs := []any{
        "audit", true,  // Flag for filtering
        "action", action,
        "resource", resource,
        "timestamp", time.Now().UTC(),
    }
    
    for k, v := range details {
        attrs = append(attrs, k, v)
    }
    
    logger.InfoContext(ctx, "Audit event", attrs...)
}

// Usage
auditLog(ctx, "user.delete", "user", map[string]any{
    "user_id": userID,
    "deleted_by": adminID,
    "reason": reason,
})
```

## What NOT to Log

### Never Log Sensitive Data

```go
// ❌ BAD - Logs password
logger.Info("Login attempt",
    "email", email,
    "password", password,  // NEVER!
)

// ✅ GOOD - No sensitive data
logger.Info("Login attempt",
    "email", email,
)

// ❌ BAD - Logs credit card
logger.Info("Payment",
    "card_number", cardNumber,  // NEVER!
)

// ✅ GOOD - Log masked version
logger.Info("Payment",
    "card_last_four", cardNumber[len(cardNumber)-4:],
)

// ❌ BAD - Logs API key
logger.Info("API call",
    "api_key", apiKey,  // NEVER!
)

// ✅ GOOD - Log presence, not value
logger.Info("API call",
    "has_api_key", apiKey != "",
)
```

### Avoid Excessive Logging

```go
// ❌ BAD - Logging in tight loop
for _, item := range items {
    logger.Debug("Processing item", "id", item.ID)  // Could be millions!
    process(item)
}

// ✅ GOOD - Log summary
logger.Info("Processing items", "count", len(items))
for _, item := range items {
    process(item)
}
logger.Info("Finished processing items", "count", len(items))

// ✅ ALSO GOOD - Sample logging
for i, item := range items {
    if i % 1000 == 0 {
        logger.Debug("Processing progress", "processed", i, "total", len(items))
    }
    process(item)
}
```

## Summary Checklist

When logging:

1. ✅ Always use `*Context` methods for trace correlation
2. ✅ Use appropriate log level
3. ✅ Include relevant context (IDs, counts, durations)
4. ✅ Use structured key-value pairs
5. ✅ Group related attributes
6. ✅ Never log sensitive data
7. ✅ Don't over-log in hot paths

```go
// Example following all guidelines
func HandleOrder(ctx context.Context, orderID string) error {
    logger.InfoContext(ctx, "Processing order",       // ✅ Context
        "order_id", orderID,                          // ✅ Key-value
    )
    
    order, err := fetchOrder(ctx, orderID)
    if err != nil {
        logger.ErrorContext(ctx, "Failed to fetch order",  // ✅ Appropriate level
            "order_id", orderID,
            "error", err,                              // ✅ Error details
        )
        return err
    }
    
    logger.InfoContext(ctx, "Order fetched",
        slog.Group("order",                            // ✅ Grouped
            slog.String("id", order.ID),
            slog.Float64("total", order.Total),
            slog.Int("items", len(order.Items)),
        ),
    )
    
    return nil
}
```

---

**Previous:** [← Using Metrics in Code](10-using-metrics.md)

**Next:** [Exporting Telemetry →](12-exporting-telemetry.md)
