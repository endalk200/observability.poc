# Configuring Logs in Go

This chapter covers how to configure the LoggerProvider in OpenTelemetry Go. The LoggerProvider manages log collection and export, and can integrate with Go's standard `log/slog` package.

## LoggerProvider Overview

The LoggerProvider handles structured logging with trace correlation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LoggerProvider                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Resource   │  "Who is producing these logs?"                        │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Processor  │  "How should logs be processed?"                       │
│  │  (Batch)    │                                                        │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Exporter   │  "Where should logs be sent?"                          │
│  └─────────────┘                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Basic Configuration

Here's the minimal configuration to get logging working:

```go
import (
    "context"
    
    "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
    "go.opentelemetry.io/otel/log/global"
    sdklog "go.opentelemetry.io/otel/sdk/log"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
)

func initLoggerProvider(ctx context.Context) (func(context.Context) error, error) {
    // 1. Create the exporter
    exporter, err := otlploggrpc.New(ctx,
        otlploggrpc.WithInsecure(),
        otlploggrpc.WithEndpoint("localhost:4317"),
    )
    if err != nil {
        return nil, err
    }

    // 2. Create the resource
    res, err := resource.Merge(
        resource.Default(),
        resource.NewSchemaless(
            semconv.ServiceName("my-service"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // 3. Create the logger provider
    lp := sdklog.NewLoggerProvider(
        sdklog.WithResource(res),
        sdklog.WithProcessor(sdklog.NewBatchProcessor(exporter)),
    )

    // 4. Register as global provider
    global.SetLoggerProvider(lp)

    // 5. Return shutdown function
    return lp.Shutdown, nil
}
```

## Exporter Options

### OTLP gRPC Exporter (Recommended)

```go
import "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"

exporter, err := otlploggrpc.New(ctx,
    // Endpoint
    otlploggrpc.WithEndpoint("localhost:4317"),
    
    // Insecure (no TLS)
    otlploggrpc.WithInsecure(),
    
    // With TLS
    // otlploggrpc.WithTLSCredentials(creds),
    
    // Custom headers
    otlploggrpc.WithHeaders(map[string]string{
        "Authorization": "Bearer " + token,
    }),
    
    // Compression
    otlploggrpc.WithCompressor("gzip"),
    
    // Timeout
    otlploggrpc.WithTimeout(30 * time.Second),
    
    // Retry
    otlploggrpc.WithRetry(otlploggrpc.RetryConfig{
        Enabled:         true,
        InitialInterval: 1 * time.Second,
        MaxInterval:     30 * time.Second,
        MaxElapsedTime:  1 * time.Minute,
    }),
)
```

### OTLP HTTP Exporter

```go
import "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"

exporter, err := otlploghttp.New(ctx,
    otlploghttp.WithEndpoint("localhost:4318"),
    otlploghttp.WithInsecure(),
    otlploghttp.WithURLPath("/v1/logs"),
)
```

### Console Exporter (For Development)

```go
import "go.opentelemetry.io/otel/exporters/stdout/stdoutlog"

exporter, err := stdoutlog.New(
    stdoutlog.WithPrettyPrint(),
)
```

Output:
```json
{
    "Timestamp": "2024-01-15T10:30:45.123Z",
    "SeverityText": "INFO",
    "Body": "User logged in",
    "Attributes": [
        {"Key": "user.email", "Value": "john@example.com"}
    ],
    "TraceID": "abc123...",
    "SpanID": "def456..."
}
```

## Log Processors

Processors handle logs before export.

### Batch Processor (Recommended)

Batches logs for efficient export:

```go
lp := sdklog.NewLoggerProvider(
    sdklog.WithProcessor(sdklog.NewBatchProcessor(exporter,
        // Maximum number of logs per batch
        sdklog.WithMaxQueueSize(2048),
        
        // Export interval
        sdklog.WithExportInterval(5 * time.Second),
        
        // Maximum export batch size
        sdklog.WithExportMaxBatchSize(512),
        
        // Export timeout
        sdklog.WithExportTimeout(30 * time.Second),
    )),
)
```

### Simple Processor

For synchronous export (development only):

```go
lp := sdklog.NewLoggerProvider(
    sdklog.WithProcessor(sdklog.NewSimpleProcessor(exporter)),
)
```

### Multiple Processors

Send to multiple destinations:

```go
lp := sdklog.NewLoggerProvider(
    // Export to collector
    sdklog.WithProcessor(sdklog.NewBatchProcessor(otlpExporter)),
    
    // Also print to console
    sdklog.WithProcessor(sdklog.NewSimpleProcessor(consoleExporter)),
)
```

## Complete Configuration Example

Here's the full configuration from our codebase:

```go
func initLoggerProvider(ctx context.Context, res *resource.Resource) (func(context.Context) error, error) {
    // Create OTLP log exporter
    exporter, err := otlploggrpc.New(ctx,
        otlploggrpc.WithInsecure(),
        otlploggrpc.WithEndpoint(getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")),
    )
    if err != nil {
        return nil, err
    }

    // Create logger provider
    lp := sdklog.NewLoggerProvider(
        sdklog.WithResource(res),
        sdklog.WithProcessor(sdklog.NewBatchProcessor(exporter)),
    )

    // Set global logger provider
    global.SetLoggerProvider(lp)

    return lp.Shutdown, nil
}
```

## Integration with slog

Go 1.21 introduced `log/slog` for structured logging. OpenTelemetry provides a bridge:

### Creating an OTel-integrated slog Logger

```go
import "go.opentelemetry.io/contrib/bridges/otelslog"

// Create a logger that sends to OTel
logger := otelslog.NewLogger("my-service")

// Use it like any slog logger
logger.Info("Server starting", "port", 8080)
logger.Error("Failed to connect", "error", err)
```

### With Options

```go
logger := otelslog.NewLogger("my-service",
    // Use a specific logger provider (instead of global)
    otelslog.WithLoggerProvider(lp),
    
    // Add default attributes
    otelslog.WithVersion("1.0.0"),
)
```

## Context-Aware Logging

The key feature of OTel logging is trace correlation. Use context-aware methods:

```go
func HandleRequest(ctx context.Context) {
    // This log will include trace_id and span_id from context
    logger.InfoContext(ctx, "Processing request",
        "user_id", userID,
    )
    
    // Without context (no trace correlation)
    logger.Info("This log won't have trace context")
}
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Context-Aware Logging                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Request arrives with trace context                                      │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────┐                        │
│  │ ctx := otelgin.SpanFromContext(c)           │                        │
│  │ ctx contains: trace_id=abc123, span_id=def456│                        │
│  └─────────────────────────────────────────────┘                        │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────┐                        │
│  │ logger.InfoContext(ctx, "message")          │                        │
│  │                                              │                        │
│  │ OTel bridge extracts trace context and      │                        │
│  │ attaches it to the log record               │                        │
│  └─────────────────────────────────────────────┘                        │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────┐                        │
│  │ Exported log:                               │                        │
│  │ {                                           │                        │
│  │   "message": "message",                     │                        │
│  │   "trace_id": "abc123",                     │                        │
│  │   "span_id": "def456",                      │                        │
│  │   ...                                       │                        │
│  │ }                                           │                        │
│  └─────────────────────────────────────────────┘                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Log Severity Levels

OpenTelemetry defines standard severity levels that map to slog levels:

| slog Level | OTel Severity | Number |
|------------|---------------|--------|
| DEBUG | Debug | 5 |
| INFO | Info | 9 |
| WARN | Warn | 13 |
| ERROR | Error | 17 |

```go
// These map to OTel severity levels
logger.Debug("Debug message")  // Severity: 5 (Debug)
logger.Info("Info message")    // Severity: 9 (Info)
logger.Warn("Warning message") // Severity: 13 (Warn)
logger.Error("Error message")  // Severity: 17 (Error)
```

## Structured Logging Best Practices

### Use Key-Value Pairs

```go
// Good - structured and searchable
logger.Info("User created",
    "user_id", user.ID,
    "email", user.Email,
    "plan", user.Plan,
)

// Bad - unstructured, hard to search
logger.Info(fmt.Sprintf("User %s created with email %s", user.ID, user.Email))
```

### Use Groups for Related Fields

```go
logger.Info("Request processed",
    slog.Group("user",
        slog.String("id", user.ID),
        slog.String("email", user.Email),
    ),
    slog.Group("request",
        slog.String("method", r.Method),
        slog.String("path", r.URL.Path),
    ),
)
```

### Always Use Context Methods

```go
// Always prefer context-aware logging
logger.InfoContext(ctx, "Processing order", "order_id", orderID)

// This enables:
// 1. Trace correlation (trace_id, span_id in logs)
// 2. Ability to find all logs for a specific request
// 3. Correlation with traces in observability tools
```

## Using with Gin Middleware

Here's a logging middleware that properly passes context:

```go
func loggingMiddleware(logger *slog.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get context with trace info from OTel middleware
        ctx := c.Request.Context()
        
        // Log incoming request with trace context
        logger.InfoContext(ctx, "Incoming request",
            "method", c.Request.Method,
            "path", c.Request.URL.Path,
            "client_ip", c.ClientIP(),
        )

        // Process request
        c.Next()

        // Log response with trace context
        logger.InfoContext(ctx, "Request completed",
            "method", c.Request.Method,
            "path", c.Request.URL.Path,
            "status", c.Writer.Status(),
        )
    }
}
```

## Alternative: Using OTel Logger Directly

You can also use the OTel logger API directly (without slog):

```go
import (
    "go.opentelemetry.io/otel/log"
    "go.opentelemetry.io/otel/log/global"
)

// Get a logger
logger := global.GetLoggerProvider().Logger("my-service")

// Create a log record
var record log.Record
record.SetTimestamp(time.Now())
record.SetSeverity(log.SeverityInfo)
record.SetBody(log.StringValue("User logged in"))
record.AddAttributes(
    log.String("user.id", userID),
    log.String("user.email", email),
)

// Emit the log
logger.Emit(ctx, record)
```

However, using the slog bridge is recommended as it's more ergonomic.

## Configuration Best Practices

### 1. Use Batch Processing in Production

```go
sdklog.WithProcessor(sdklog.NewBatchProcessor(exporter,
    sdklog.WithExportInterval(5 * time.Second),
    sdklog.WithMaxQueueSize(2048),
))
```

### 2. Handle Shutdown Properly

```go
defer func() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    if err := lp.Shutdown(ctx); err != nil {
        log.Printf("Error shutting down logger provider: %v", err)
    }
}()
```

### 3. Don't Log Sensitive Data

```go
// Bad - logs password
logger.Info("Login attempt", "password", password)

// Good - no sensitive data
logger.Info("Login attempt", "user_email", email)
```

## Troubleshooting

### Logs Not Appearing

1. **Check endpoint**: Is the collector running?
2. **Check batch settings**: Logs might be queued
3. **Force flush**: Call `lp.ForceFlush(ctx)` to flush immediately
4. **Use console exporter**: Verify logs are being created

### Missing Trace Context

1. **Use InfoContext/ErrorContext**: Not Info/Error
2. **Pass context correctly**: Ensure ctx has trace info
3. **Check middleware order**: OTel middleware must run first

### High Memory Usage

1. **Reduce queue size**: Lower `WithMaxQueueSize`
2. **Reduce batch size**: Lower `WithExportMaxBatchSize`
3. **Increase export frequency**: Lower `WithExportInterval`

## Summary

| Component | Purpose | Default |
|-----------|---------|---------|
| **Exporter** | Where to send logs | None (must configure) |
| **Processor** | Batch/Simple processing | Batch |
| **slog Bridge** | Integrate with Go's slog | Recommended approach |
| **Context Methods** | Trace correlation | Always use when possible |

---

**Previous:** [← Configuring Metrics](07-configuring-metrics.md)

**Next:** [Using Traces in Code →](09-using-traces.md)
