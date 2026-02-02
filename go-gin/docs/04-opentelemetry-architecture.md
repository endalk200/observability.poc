# OpenTelemetry Architecture

OpenTelemetry (OTel) is a vendor-neutral, open-source observability framework. It provides APIs, libraries, agents, and instrumentation to capture telemetry data (traces, metrics, and logs) from your applications. In this chapter, we'll explore how OpenTelemetry works and its key components.

## What is OpenTelemetry?

OpenTelemetry is:

1. **A specification** - Defines how telemetry data should be collected and transmitted
2. **A set of APIs** - Language-specific interfaces for instrumentation
3. **SDKs** - Implementations of the APIs for each language
4. **Tools** - Collectors, auto-instrumentation agents, etc.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      OPENTELEMETRY ECOSYSTEM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   SPECIFICATION │  │      APIs       │  │      SDKs       │          │
│  │                 │  │                 │  │                 │          │
│  │  • Data models  │  │  • Tracing API  │  │  • Go SDK       │          │
│  │  • Protocols    │  │  • Metrics API  │  │  • Java SDK     │          │
│  │  • Semantic     │  │  • Logging API  │  │  • Python SDK   │          │
│  │    conventions  │  │                 │  │  • JS SDK       │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │    COLLECTOR    │  │  INSTRUMENTATION│  │    EXPORTERS    │          │
│  │                 │  │                 │  │                 │          │
│  │  Receives,      │  │  • Auto         │  │  • OTLP         │          │
│  │  processes,     │  │  • Manual       │  │  • Prometheus   │          │
│  │  exports data   │  │  • Libraries    │  │  • Jaeger       │          │
│  │                 │  │                 │  │  • Zipkin       │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why OpenTelemetry?

Before OpenTelemetry, you had to choose between incompatible solutions:

```
BEFORE: Vendor Lock-in
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Your Code                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  // Jaeger tracing                                               │    │
│  │  import jaegerClient                                             │    │
│  │  tracer := jaegerClient.NewTracer(...)                          │    │
│  │                                                                  │    │
│  │  // Prometheus metrics                                           │    │
│  │  import prometheusClient                                         │    │
│  │  counter := prometheus.NewCounter(...)                          │    │
│  │                                                                  │    │
│  │  // DataDog APM (another format entirely!)                       │    │
│  │  import datadogTracer                                           │    │
│  │  span := datadogTracer.Start(...)                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Problem: Switching vendors means rewriting all instrumentation!        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

AFTER: OpenTelemetry (Vendor Neutral)
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Your Code (ONE API for everything)                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  import "go.opentelemetry.io/otel"                              │    │
│  │                                                                  │    │
│  │  tracer := otel.Tracer("my-service")                            │    │
│  │  meter := otel.Meter("my-service")                              │    │
│  │  logger := global.GetLoggerProvider().Logger("my-service")      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                     │                                    │
│                                     ▼                                    │
│                            ┌───────────────┐                             │
│                            │  OTLP Export  │                             │
│                            └───────────────┘                             │
│                                     │                                    │
│          ┌──────────────────────────┼──────────────────────────┐        │
│          ▼                          ▼                          ▼        │
│    ┌──────────┐              ┌──────────┐              ┌──────────┐    │
│    │  Jaeger  │              │ DataDog  │              │  Grafana │    │
│    └──────────┘              └──────────┘              └──────────┘    │
│                                                                          │
│  Benefit: Switch backends without changing code!                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API

The API defines the interfaces for creating telemetry. It's what you import and use in your code:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
    "go.opentelemetry.io/otel/metric"
)

// Get a tracer
tracer := otel.Tracer("my-service")

// Get a meter
meter := otel.Meter("my-service")
```

**Key point:** The API is stable and doesn't change. Your instrumentation code stays the same regardless of which backend you use.

### 2. SDK

The SDK implements the API. It handles:
- Creating and managing telemetry data
- Sampling
- Processing
- Exporting

```go
import (
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
)

// Create a tracer provider (SDK implementation)
tp := sdktrace.NewTracerProvider(
    sdktrace.WithBatcher(exporter),
    sdktrace.WithResource(resource),
)

// Register as global provider
otel.SetTracerProvider(tp)
```

### 3. Exporters

Exporters send telemetry data to backends. OpenTelemetry supports many exporters:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPORTERS                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OTLP (OpenTelemetry Protocol) ─── The standard, recommended exporter   │
│  ├── otlptracegrpc   (traces via gRPC)                                  │
│  ├── otlptrachttp    (traces via HTTP)                                  │
│  ├── otlpmetricgrpc  (metrics via gRPC)                                 │
│  ├── otlpmetrichttp  (metrics via HTTP)                                 │
│  ├── otlploggrpc     (logs via gRPC)                                    │
│  └── otlploghttp     (logs via HTTP)                                    │
│                                                                          │
│  Vendor-Specific:                                                        │
│  ├── Jaeger exporter                                                    │
│  ├── Zipkin exporter                                                    │
│  ├── Prometheus exporter                                                │
│  └── Many more...                                                       │
│                                                                          │
│  Debug/Development:                                                      │
│  ├── stdout exporter (prints to console)                                │
│  └── file exporter                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Resource

A Resource describes the entity producing telemetry (your service):

```go
import (
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
)

res, _ := resource.Merge(
    resource.Default(),
    resource.NewSchemaless(
        semconv.ServiceName("user-api"),
        semconv.ServiceVersion("1.0.0"),
        semconv.DeploymentEnvironment("production"),
    ),
)
```

This information is attached to all telemetry, making it easy to identify where data came from.

### 5. Propagators

Propagators handle passing trace context across service boundaries:

```go
import "go.opentelemetry.io/otel/propagation"

// Set up W3C Trace Context propagation
otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
    propagation.TraceContext{},  // W3C standard
    propagation.Baggage{},       // User-defined key-value pairs
))
```

## The Data Flow

Here's how telemetry flows from your application to a backend:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        YOUR APPLICATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INSTRUMENTATION (Your Code)                                          │
│     ┌─────────────────────────────────────────────────────────┐         │
│     │  span := tracer.Start(ctx, "operation")                 │         │
│     │  meter.Add(ctx, 1)                                      │         │
│     │  logger.Info("message")                                 │         │
│     └─────────────────────────────────────────────────────────┘         │
│                              │                                           │
│                              ▼                                           │
│  2. API LAYER                                                            │
│     ┌─────────────────────────────────────────────────────────┐         │
│     │  Tracer API  │  Meter API  │  Logger API                │         │
│     └─────────────────────────────────────────────────────────┘         │
│                              │                                           │
│                              ▼                                           │
│  3. SDK (Processing)                                                     │
│     ┌─────────────────────────────────────────────────────────┐         │
│     │  TracerProvider  │  MeterProvider  │  LoggerProvider    │         │
│     │                                                          │         │
│     │  • Sampling      • Aggregation     • Batching           │         │
│     │  • Processing    • Processing      • Processing         │         │
│     └─────────────────────────────────────────────────────────┘         │
│                              │                                           │
│                              ▼                                           │
│  4. EXPORTERS                                                            │
│     ┌─────────────────────────────────────────────────────────┐         │
│     │  OTLP Trace    │  OTLP Metric   │  OTLP Log            │         │
│     │  Exporter      │  Exporter      │  Exporter            │         │
│     └─────────────────────────────────────────────────────────┘         │
│                              │                                           │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                    OTLP Protocol (gRPC/HTTP)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     OTEL COLLECTOR (Optional)                            │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                     │
│  │ Receivers  │───►│ Processors │───►│ Exporters  │                     │
│  └────────────┘    └────────────┘    └────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  Tempo   │        │Prometheus│        │   Loki   │
    │ (traces) │        │ (metrics)│        │  (logs)  │
    └──────────┘        └──────────┘        └──────────┘
```

## The Providers

OpenTelemetry uses a "provider" pattern for each telemetry type:

### TracerProvider

Manages trace creation and export:

```go
tp := sdktrace.NewTracerProvider(
    sdktrace.WithBatcher(exporter),   // How to export
    sdktrace.WithResource(resource),  // Service identity
    sdktrace.WithSampler(sampler),    // What to sample
)
otel.SetTracerProvider(tp)

// Now get tracers from the global provider
tracer := otel.Tracer("my-component")
```

### MeterProvider

Manages metric collection and export:

```go
mp := sdkmetric.NewMeterProvider(
    sdkmetric.WithResource(resource),
    sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter,
        sdkmetric.WithInterval(15*time.Second),
    )),
)
otel.SetMeterProvider(mp)

// Now get meters from the global provider
meter := otel.Meter("my-component")
```

### LoggerProvider

Manages log collection and export:

```go
lp := sdklog.NewLoggerProvider(
    sdklog.WithResource(resource),
    sdklog.WithProcessor(sdklog.NewBatchProcessor(exporter)),
)
global.SetLoggerProvider(lp)

// Use with slog bridge
logger := otelslog.NewLogger("my-service")
```

## OTLP: The OpenTelemetry Protocol

OTLP is the native protocol for transmitting telemetry data:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              OTLP                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Transport Options:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  gRPC (Recommended)                                              │    │
│  │  • Port 4317                                                     │    │
│  │  • Binary protocol                                               │    │
│  │  • Efficient, streaming                                          │    │
│  │  • Built-in compression                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  HTTP/Protobuf                                                   │    │
│  │  • Port 4318                                                     │    │
│  │  • Binary protocol over HTTP                                     │    │
│  │  • Easier to work with firewalls/proxies                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  HTTP/JSON                                                       │    │
│  │  • Port 4318                                                     │    │
│  │  • Human-readable                                                │    │
│  │  • Good for debugging                                            │    │
│  │  • Less efficient                                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## The OpenTelemetry Collector

The Collector is a vendor-agnostic proxy that receives, processes, and exports telemetry:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      OTEL COLLECTOR                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│         RECEIVERS              PROCESSORS           EXPORTERS            │
│    ┌─────────────────┐    ┌─────────────────┐  ┌─────────────────┐      │
│    │                 │    │                 │  │                 │      │
│    │  OTLP (gRPC)    │    │  Batch          │  │  OTLP           │      │
│    │  OTLP (HTTP)    │───►│  Filter         │─►│  Prometheus     │      │
│    │  Prometheus     │    │  Transform      │  │  Jaeger         │      │
│    │  Jaeger         │    │  Sampling       │  │  Loki           │      │
│    │  Zipkin         │    │  Attributes     │  │  File           │      │
│    │                 │    │                 │  │  ...            │      │
│    └─────────────────┘    └─────────────────┘  └─────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Use a Collector?

1. **Decoupling**: Applications don't need to know about backends
2. **Processing**: Filter, transform, sample data before storage
3. **Fan-out**: Send to multiple backends from one source
4. **Buffering**: Handle temporary backend outages
5. **Protocol translation**: Convert between formats

### Collector Alternatives

In this project, we use **Grafana Alloy** instead of the standard OTel Collector. Alloy is Grafana's distribution with additional features:

```go
// Our config.alloy configuration

// Receive OTLP data
otelcol.receiver.otlp "default" {
  grpc { endpoint = "0.0.0.0:4317" }
  http { endpoint = "0.0.0.0:4318" }
  
  output {
    metrics = [otelcol.processor.batch.default.input]
    traces  = [otelcol.processor.batch.default.input]
    logs    = [otelcol.processor.batch.default.input]
  }
}

// Send to different backends
otelcol.processor.batch "default" {
  output {
    metrics = [otelcol.exporter.prometheus.default.input]  // → Prometheus
    traces  = [otelcol.exporter.otlp.tempo.input]          // → Tempo
    logs    = [otelcol.exporter.loki.default.input]        // → Loki
  }
}
```

## Semantic Conventions

OpenTelemetry defines standard names for common attributes:

```go
import semconv "go.opentelemetry.io/otel/semconv/v1.27.0"

// Service attributes
semconv.ServiceName("user-api")
semconv.ServiceVersion("1.0.0")

// HTTP attributes
semconv.HTTPMethod("GET")
semconv.HTTPStatusCode(200)
semconv.HTTPRoute("/users/{id}")

// Database attributes
semconv.DBSystemPostgreSQL
semconv.DBName("users")
semconv.DBOperation("SELECT")
```

Using semantic conventions ensures:
- Consistency across services
- Better visualization in dashboards
- Interoperability with tools and backends

## Context: The Glue

Context (`context.Context` in Go) carries telemetry information:

```go
func HandleRequest(ctx context.Context) {
    // Start a span - it's stored in context
    ctx, span := tracer.Start(ctx, "HandleRequest")
    defer span.End()
    
    // Pass context to child functions
    processData(ctx)  // Will create child spans
}

func processData(ctx context.Context) {
    // Get the current span from context
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(attribute.String("data.type", "user"))
    
    // Logs with context include trace info
    logger.InfoContext(ctx, "Processing data")
}
```

## Summary

| Component | Purpose |
|-----------|---------|
| **API** | Interfaces you use in code (stable) |
| **SDK** | Implementation of the API |
| **Exporters** | Send data to backends |
| **Resource** | Describes your service |
| **Propagators** | Pass context across boundaries |
| **Providers** | Manage telemetry lifecycle |
| **Collector** | Proxy for receiving/processing/exporting |
| **OTLP** | Standard protocol for telemetry |

## Key Takeaways

1. **Vendor neutral** - Instrument once, export anywhere
2. **Three signals** - Traces, metrics, and logs unified
3. **Provider pattern** - Configure providers, get instances from global
4. **Context is key** - Carries trace context through your application
5. **Collector is optional** - But recommended for production

---

**Previous:** [← Understanding Metrics](03-concepts-metrics.md)

**Next:** [Setting Up OpenTelemetry in Go →](05-setup-go.md)
