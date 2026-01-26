# Configuring Traces in Go

This chapter covers how to configure the TracerProvider in OpenTelemetry Go. The TracerProvider is responsible for creating tracers and managing how spans are processed and exported.

## TracerProvider Overview

The TracerProvider is the central configuration point for tracing:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TracerProvider                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Resource   │  "Who is producing these traces?"                      │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Sampler    │  "Which traces should we keep?"                        │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │ SpanProcessor│ "How should spans be processed?"                      │
│  │  (Batcher)  │                                                        │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Exporter   │  "Where should traces be sent?"                        │
│  └─────────────┘                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Basic Configuration

Here's the minimal configuration to get tracing working:

```go
import (
    "context"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
)

func initTracerProvider(ctx context.Context) (func(context.Context) error, error) {
    // 1. Create the exporter
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithInsecure(),
        otlptracegrpc.WithEndpoint("localhost:4317"),
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

    // 3. Create the tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )

    // 4. Register as global provider
    otel.SetTracerProvider(tp)

    // 5. Return shutdown function
    return tp.Shutdown, nil
}
```

## Exporter Options

### OTLP gRPC Exporter (Recommended)

```go
import "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"

exporter, err := otlptracegrpc.New(ctx,
    // Endpoint (host:port)
    otlptracegrpc.WithEndpoint("localhost:4317"),
    
    // Use insecure connection (no TLS)
    otlptracegrpc.WithInsecure(),
    
    // Or with TLS
    // otlptracegrpc.WithTLSCredentials(creds),
    
    // Custom headers (for authentication)
    otlptracegrpc.WithHeaders(map[string]string{
        "Authorization": "Bearer " + token,
    }),
    
    // Compression
    otlptracegrpc.WithCompressor("gzip"),
    
    // Timeout
    otlptracegrpc.WithTimeout(30 * time.Second),
    
    // Retry configuration
    otlptracegrpc.WithRetry(otlptracegrpc.RetryConfig{
        Enabled:         true,
        InitialInterval: 1 * time.Second,
        MaxInterval:     30 * time.Second,
        MaxElapsedTime:  1 * time.Minute,
    }),
)
```

### OTLP HTTP Exporter

If gRPC isn't available (firewalls, etc.), use HTTP:

```go
import "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"

exporter, err := otlptracehttp.New(ctx,
    otlptracehttp.WithEndpoint("localhost:4318"),
    otlptracehttp.WithInsecure(),
    otlptracehttp.WithURLPath("/v1/traces"),
)
```

### Console Exporter (For Development)

Prints traces to stdout - great for debugging:

```go
import "go.opentelemetry.io/otel/exporters/stdout/stdouttrace"

exporter, err := stdouttrace.New(
    stdouttrace.WithPrettyPrint(),
)
```

Output:
```json
{
    "Name": "HTTP GET /users/42",
    "SpanContext": {
        "TraceID": "abc123...",
        "SpanID": "def456..."
    },
    "StartTime": "2024-01-15T10:30:45.000Z",
    "EndTime": "2024-01-15T10:30:45.052Z",
    "Attributes": [
        {"Key": "http.method", "Value": "GET"},
        {"Key": "http.status_code", "Value": 200}
    ]
}
```

## Span Processors

Span processors determine how spans are handled before export.

### Batch Processor (Recommended for Production)

Batches spans for efficient export:

```go
tp := sdktrace.NewTracerProvider(
    sdktrace.WithBatcher(exporter,
        // Maximum batch size
        sdktrace.WithMaxExportBatchSize(512),
        
        // Maximum queue size
        sdktrace.WithMaxQueueSize(2048),
        
        // Export interval
        sdktrace.WithBatchTimeout(5 * time.Second),
        
        // Export timeout
        sdktrace.WithExportTimeout(30 * time.Second),
    ),
)
```

### Simple Processor (For Development)

Exports spans immediately (no batching):

```go
tp := sdktrace.NewTracerProvider(
    sdktrace.WithSpanProcessor(sdktrace.NewSimpleSpanProcessor(exporter)),
)
```

**Warning**: Don't use SimpleSpanProcessor in production - it's synchronous and will slow down your application.

### Multiple Processors

You can use multiple processors (e.g., batch to collector + simple to console):

```go
tp := sdktrace.NewTracerProvider(
    // Batch to collector
    sdktrace.WithBatcher(collectorExporter),
    
    // Also log to console (development only)
    sdktrace.WithSpanProcessor(sdktrace.NewSimpleSpanProcessor(consoleExporter)),
    
    sdktrace.WithResource(res),
)
```

## Sampling

Sampling controls which traces are recorded. In high-throughput systems, you can't record everything.

### Available Samplers

```go
import sdktrace "go.opentelemetry.io/otel/sdk/trace"

// Always sample - record every trace (default)
sdktrace.AlwaysSample()

// Never sample - record nothing
sdktrace.NeverSample()

// Probability-based - sample X% of traces
sdktrace.TraceIDRatioBased(0.5)  // 50%
sdktrace.TraceIDRatioBased(0.1)  // 10%

// Parent-based - respect parent's sampling decision
sdktrace.ParentBased(sdktrace.AlwaysSample())
sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))
```

### Parent-Based Sampling (Recommended)

Parent-based sampling ensures consistent sampling decisions across services:

```go
tp := sdktrace.NewTracerProvider(
    sdktrace.WithSampler(sdktrace.ParentBased(
        // Root spans: sample 10%
        sdktrace.TraceIDRatioBased(0.1),
        
        // If parent was sampled, sample this span too
        // If parent was not sampled, don't sample
    )),
)
```

```
Service A                          Service B
┌──────────────────────────┐      ┌──────────────────────────┐
│ Root Span (sampled: YES) │─────►│ Child Span (sampled: YES)│
│ TraceID: abc123          │      │ Inherits parent decision │
└──────────────────────────┘      └──────────────────────────┘

┌──────────────────────────┐      ┌──────────────────────────┐
│ Root Span (sampled: NO)  │─────►│ Child Span (sampled: NO) │
│ TraceID: def456          │      │ Inherits parent decision │
└──────────────────────────┘      └──────────────────────────┘
```

### Sampling Strategies

| Scenario | Sampler | Why |
|----------|---------|-----|
| Development | `AlwaysSample()` | See everything |
| Low traffic | `AlwaysSample()` | Can afford to record all |
| High traffic | `TraceIDRatioBased(0.1)` | 10% is enough for analysis |
| Microservices | `ParentBased(TraceIDRatioBased(0.1))` | Consistent across services |

## Complete Configuration Example

Here's the full configuration from our codebase:

```go
func initTracerProvider(ctx context.Context, res *resource.Resource) (func(context.Context) error, error) {
    // Create OTLP trace exporter
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithInsecure(),
        otlptracegrpc.WithEndpoint(getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")),
    )
    if err != nil {
        return nil, err
    }

    // Create tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )

    // Set global tracer provider
    otel.SetTracerProvider(tp)

    return tp.Shutdown, nil
}
```

## Advanced Configuration

### Custom ID Generator

Generate custom trace/span IDs (rarely needed):

```go
type customIDGenerator struct{}

func (g *customIDGenerator) NewIDs(ctx context.Context) (trace.TraceID, trace.SpanID) {
    // Custom ID generation logic
}

func (g *customIDGenerator) NewSpanID(ctx context.Context, traceID trace.TraceID) trace.SpanID {
    // Custom span ID generation logic
}

tp := sdktrace.NewTracerProvider(
    sdktrace.WithIDGenerator(&customIDGenerator{}),
)
```

### Span Limits

Limit the size of span data to prevent memory issues:

```go
tp := sdktrace.NewTracerProvider(
    sdktrace.WithSpanLimits(sdktrace.SpanLimits{
        AttributeCountLimit:         128,
        EventCountLimit:             128,
        LinkCountLimit:              128,
        AttributePerEventCountLimit: 128,
        AttributePerLinkCountLimit:  128,
    }),
)
```

## Getting a Tracer

Once the provider is configured, get a tracer:

```go
// From global provider (most common)
tracer := otel.Tracer("my-service")

// With version
tracer := otel.Tracer("my-service",
    trace.WithInstrumentationVersion("1.0.0"),
)

// From specific provider
tracer := tp.Tracer("my-service")
```

## HTTP Server Auto-Instrumentation

For Gin, use the middleware:

```go
import "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"

router := gin.New()
router.Use(otelgin.Middleware("my-service"))
```

This automatically:
- Creates spans for each HTTP request
- Sets standard HTTP attributes
- Extracts trace context from incoming requests
- Propagates trace context to downstream services

## HTTP Client Auto-Instrumentation

For outgoing HTTP requests:

```go
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

// Wrap the default transport
client := &http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}

// Now all requests create spans
resp, err := client.Get("https://api.example.com/users")
```

## Configuration Checklist

- [ ] OTLP endpoint configured
- [ ] Resource with service name
- [ ] Batch processor for production
- [ ] Appropriate sampler
- [ ] Propagator set up (see previous chapter)
- [ ] Shutdown function called on exit
- [ ] HTTP middleware added
- [ ] HTTP client wrapped (if making external calls)

## Troubleshooting

### Traces Not Appearing

1. **Check endpoint**: Is the collector running? Can you reach it?
   ```bash
   curl http://localhost:4317  # Should not timeout
   ```

2. **Check sampling**: Are you sampling too aggressively?
   ```go
   // Temporarily use AlwaysSample to debug
   sdktrace.WithSampler(sdktrace.AlwaysSample())
   ```

3. **Check shutdown**: Is `tp.Shutdown()` being called?

4. **Use console exporter**: Add a console exporter to see if spans are created
   ```go
   sdktrace.WithSpanProcessor(sdktrace.NewSimpleSpanProcessor(consoleExporter))
   ```

### High Memory Usage

1. Reduce queue size:
   ```go
   sdktrace.WithMaxQueueSize(1024)  // Default is 2048
   ```

2. Sample more aggressively:
   ```go
   sdktrace.TraceIDRatioBased(0.01)  // 1%
   ```

## Summary

| Component | Purpose | Default |
|-----------|---------|---------|
| **Exporter** | Where to send traces | None (must configure) |
| **Batch Processor** | Efficient export | Batch size 512, 5s timeout |
| **Sampler** | Which traces to keep | AlwaysSample |
| **Resource** | Service identification | Basic process info |

---

**Previous:** [← Setting Up OpenTelemetry](05-setup-go.md)

**Next:** [Configuring Metrics →](07-configuring-metrics.md)
