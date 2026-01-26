# Setting Up OpenTelemetry in Go

Now that you understand the concepts, let's set up OpenTelemetry in a Go project. This chapter covers dependencies, initialization, and the foundation you need before configuring individual signals.

## Prerequisites

- Go 1.21 or later (for `log/slog` support)
- A Go project initialized with `go mod init`

## Installing Dependencies

OpenTelemetry is modular - you install only what you need. Here are the core packages:

### Core Packages

```bash
# Core API and SDK
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk

# Trace support
go get go.opentelemetry.io/otel/sdk/trace
go get go.opentelemetry.io/otel/trace

# Metrics support
go get go.opentelemetry.io/otel/sdk/metric
go get go.opentelemetry.io/otel/metric

# Logs support
go get go.opentelemetry.io/otel/sdk/log
go get go.opentelemetry.io/otel/log
```

### OTLP Exporters (gRPC)

```bash
# Trace exporter
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc

# Metrics exporter
go get go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc

# Logs exporter
go get go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc
```

### Instrumentation Libraries

```bash
# HTTP server instrumentation (Gin)
go get go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin

# HTTP client instrumentation
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

# slog bridge (for structured logging)
go get go.opentelemetry.io/contrib/bridges/otelslog
```

### Complete go.mod Example

Here's what your `go.mod` might look like:

```go
module github.com/yourusername/your-api

go 1.24.0

require (
    github.com/gin-gonic/gin v1.11.0
    go.opentelemetry.io/contrib/bridges/otelslog v0.10.0
    go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin v0.64.0
    go.opentelemetry.io/otel v1.39.0
    go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc v0.15.0
    go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc v1.39.0
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.39.0
    go.opentelemetry.io/otel/log v0.15.0
    go.opentelemetry.io/otel/metric v1.39.0
    go.opentelemetry.io/otel/sdk v1.39.0
    go.opentelemetry.io/otel/sdk/log v0.15.0
    go.opentelemetry.io/otel/sdk/metric v1.39.0
    go.opentelemetry.io/otel/trace v1.39.0
)
```

## Project Structure

Here's a recommended structure for a project with OpenTelemetry:

```
your-project/
├── main.go                 # Application entry point & OTel init
├── handlers/
│   └── user.go            # HTTP handlers with instrumentation
├── storage/
│   └── json_store.go      # Data layer
├── models/
│   └── user.go            # Data models
├── go.mod
└── go.sum
```

## Initialization Overview

OpenTelemetry initialization follows this pattern:

```go
func main() {
    ctx := context.Background()
    
    // 1. Initialize OpenTelemetry
    shutdown, err := initOtel(ctx)
    if err != nil {
        log.Fatalf("Failed to initialize OpenTelemetry: %v", err)
    }
    defer shutdown(ctx)  // Clean shutdown
    
    // 2. Create logger (uses OTel)
    logger := otelslog.NewLogger("my-service")
    
    // 3. Get meter for custom metrics
    meter := otel.Meter("my-service")
    
    // 4. Start your application
    // ...
}
```

## Creating a Resource

A Resource identifies your service. Create it first:

```go
import (
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
)

const serviceName = "user-api"

func createResource() (*resource.Resource, error) {
    return resource.Merge(
        resource.Default(),
        resource.NewSchemaless(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
}
```

### Resource Attributes

Common attributes to include:

```go
resource.NewSchemaless(
    // Required
    semconv.ServiceName("user-api"),
    
    // Recommended
    semconv.ServiceVersion("1.0.0"),
    semconv.ServiceNamespace("production"),
    semconv.DeploymentEnvironment("prod"),
    
    // Optional but useful
    attribute.String("host.name", hostname),
    attribute.String("cloud.provider", "aws"),
    attribute.String("cloud.region", "us-east-1"),
)
```

## Setting Up Context Propagation

Context propagation passes trace information across service boundaries:

```go
import "go.opentelemetry.io/otel/propagation"

func setupPropagation() {
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},  // W3C Trace Context
        propagation.Baggage{},       // W3C Baggage
    ))
}
```

This enables:
- Automatic trace context in outgoing HTTP requests
- Automatic extraction of trace context from incoming requests
- Distributed tracing across services

## The Complete Init Function

Here's the full initialization function from our codebase:

```go
package main

import (
    "context"
    "log"
    "log/slog"
    "os"
    "time"

    "go.opentelemetry.io/contrib/bridges/otelslog"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/log/global"
    "go.opentelemetry.io/otel/propagation"
    sdklog "go.opentelemetry.io/otel/sdk/log"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
)

const serviceName = "user-api"

// initOtel initializes OpenTelemetry with traces, metrics, and logs
func initOtel(ctx context.Context) (func(context.Context) error, error) {
    var shutdownFuncs []func(context.Context) error

    // Create resource with service information
    res, err := resource.Merge(
        resource.Default(),
        resource.NewSchemaless(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Set up propagator for distributed tracing
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    // Initialize trace provider
    traceShutdown, err := initTracerProvider(ctx, res)
    if err != nil {
        return nil, err
    }
    shutdownFuncs = append(shutdownFuncs, traceShutdown)

    // Initialize meter provider
    meterShutdown, err := initMeterProvider(ctx, res)
    if err != nil {
        return nil, err
    }
    shutdownFuncs = append(shutdownFuncs, meterShutdown)

    // Initialize logger provider
    loggerShutdown, err := initLoggerProvider(ctx, res)
    if err != nil {
        return nil, err
    }
    shutdownFuncs = append(shutdownFuncs, loggerShutdown)

    // Return combined shutdown function
    return func(ctx context.Context) error {
        var err error
        for _, fn := range shutdownFuncs {
            if shutdownErr := fn(ctx); shutdownErr != nil {
                err = shutdownErr
            }
        }
        return err
    }, nil
}
```

## Environment Variables

OpenTelemetry supports configuration via environment variables:

```bash
# OTLP endpoint (where to send telemetry)
OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317

# Service name (alternative to code)
OTEL_SERVICE_NAME=user-api

# Resource attributes
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=1.0.0

# Trace sampling (1.0 = 100%, 0.5 = 50%)
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.5

# Log level
OTEL_LOG_LEVEL=debug
```

In your code, read these with a helper:

```go
func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

// Usage
endpoint := getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")
```

## Using in main()

Here's how to use everything in your main function:

```go
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

    // Get meter for custom metrics
    meter := otel.Meter(serviceName)

    // Initialize your application...
    router := gin.New()
    
    // Add OTel middleware for automatic tracing
    router.Use(otelgin.Middleware(serviceName))
    
    // ... rest of your setup
}
```

## Graceful Shutdown

Always ensure proper shutdown to flush pending telemetry:

```go
func main() {
    ctx := context.Background()
    
    shutdown, err := initOtel(ctx)
    if err != nil {
        log.Fatal(err)
    }
    
    // Handle OS signals for graceful shutdown
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    
    // Start server in goroutine
    go func() {
        if err := server.Start(); err != nil {
            log.Printf("Server error: %v", err)
        }
    }()
    
    // Wait for shutdown signal
    <-sigChan
    
    // Create shutdown context with timeout
    shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    // Shutdown OTel (flushes pending data)
    if err := shutdown(shutdownCtx); err != nil {
        log.Printf("OTel shutdown error: %v", err)
    }
}
```

## Common Import Groups

Here's a reference for the imports you'll commonly use:

```go
import (
    // Core OTel
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/propagation"
    
    // Tracing
    "go.opentelemetry.io/otel/trace"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    
    // Metrics
    "go.opentelemetry.io/otel/metric"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    
    // Logging
    "go.opentelemetry.io/otel/log/global"
    sdklog "go.opentelemetry.io/otel/sdk/log"
    "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
    "go.opentelemetry.io/contrib/bridges/otelslog"
    
    // Resource and conventions
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
    
    // Instrumentation
    "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)
```

## Verification

To verify your setup is working:

1. **Check logs for initialization**:
```
2024/01/15 10:30:00 INFO Starting User API server
```

2. **Check the collector receives data** (if using one)

3. **Make a request and verify trace creation**

## Summary

| Step | Purpose |
|------|---------|
| Install packages | Get OTel libraries |
| Create resource | Identify your service |
| Set propagator | Enable distributed tracing |
| Init providers | Set up trace, metric, log providers |
| Register globally | Make providers available app-wide |
| Graceful shutdown | Flush pending data on exit |

## What's Next

Now that you have the foundation, let's dive into configuring each signal:

1. [Configuring Traces](06-configuring-traces.md) - Set up the tracer provider
2. [Configuring Metrics](07-configuring-metrics.md) - Set up the meter provider
3. [Configuring Logs](08-configuring-logs.md) - Set up the logger provider

---

**Previous:** [← OpenTelemetry Architecture](04-opentelemetry-architecture.md)

**Next:** [Configuring Traces →](06-configuring-traces.md)
