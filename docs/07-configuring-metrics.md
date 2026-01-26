# Configuring Metrics in Go

This chapter covers how to configure the MeterProvider in OpenTelemetry Go. The MeterProvider manages metric collection, aggregation, and export.

## MeterProvider Overview

The MeterProvider handles everything related to metrics:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MeterProvider                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Resource   │  "Who is producing these metrics?"                     │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │   Reader    │  "How/when should metrics be collected?"               │
│  │ (Periodic)  │                                                        │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Exporter   │  "Where should metrics be sent?"                       │
│  └─────────────┘                                                        │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │   Views     │  "How should metrics be aggregated?" (optional)        │
│  └─────────────┘                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Basic Configuration

Here's the minimal configuration to get metrics working:

```go
import (
    "context"
    "time"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
)

func initMeterProvider(ctx context.Context) (func(context.Context) error, error) {
    // 1. Create the exporter
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithInsecure(),
        otlpmetricgrpc.WithEndpoint("localhost:4317"),
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

    // 3. Create the meter provider
    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithResource(res),
        sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter,
            sdkmetric.WithInterval(15*time.Second),
        )),
    )

    // 4. Register as global provider
    otel.SetMeterProvider(mp)

    // 5. Return shutdown function
    return mp.Shutdown, nil
}
```

## Exporter Options

### OTLP gRPC Exporter (Recommended)

```go
import "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"

exporter, err := otlpmetricgrpc.New(ctx,
    // Endpoint
    otlpmetricgrpc.WithEndpoint("localhost:4317"),
    
    // Insecure (no TLS)
    otlpmetricgrpc.WithInsecure(),
    
    // With TLS
    // otlpmetricgrpc.WithTLSCredentials(creds),
    
    // Custom headers
    otlpmetricgrpc.WithHeaders(map[string]string{
        "Authorization": "Bearer " + token,
    }),
    
    // Compression
    otlpmetricgrpc.WithCompressor("gzip"),
    
    // Timeout
    otlpmetricgrpc.WithTimeout(30 * time.Second),
    
    // Retry configuration
    otlpmetricgrpc.WithRetry(otlpmetricgrpc.RetryConfig{
        Enabled:         true,
        InitialInterval: 1 * time.Second,
        MaxInterval:     30 * time.Second,
        MaxElapsedTime:  1 * time.Minute,
    }),
    
    // Temporality (how deltas are reported)
    otlpmetricgrpc.WithTemporalitySelector(preferDeltaTemporalitySelector),
)
```

### OTLP HTTP Exporter

```go
import "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"

exporter, err := otlpmetrichttp.New(ctx,
    otlpmetrichttp.WithEndpoint("localhost:4318"),
    otlpmetrichttp.WithInsecure(),
    otlpmetrichttp.WithURLPath("/v1/metrics"),
)
```

### Prometheus Exporter

For Prometheus pull-based scraping:

```go
import "go.opentelemetry.io/otel/exporters/prometheus"

exporter, err := prometheus.New()
if err != nil {
    return nil, err
}

// Start HTTP server for Prometheus to scrape
http.Handle("/metrics", promhttp.Handler())
go http.ListenAndServe(":2112", nil)

mp := sdkmetric.NewMeterProvider(
    sdkmetric.WithReader(exporter),
)
```

### Console Exporter (For Development)

```go
import "go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"

exporter, err := stdoutmetric.New(
    stdoutmetric.WithPrettyPrint(),
)
```

## Metric Readers

Readers control when and how metrics are exported.

### Periodic Reader (Most Common)

Exports metrics at regular intervals:

```go
mp := sdkmetric.NewMeterProvider(
    sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter,
        // Export every 15 seconds
        sdkmetric.WithInterval(15 * time.Second),
        
        // Timeout for each export
        sdkmetric.WithTimeout(30 * time.Second),
    )),
)
```

### Manual Reader

For testing or custom export timing:

```go
reader := sdkmetric.NewManualReader()

mp := sdkmetric.NewMeterProvider(
    sdkmetric.WithReader(reader),
)

// Manually trigger export
var rm metricdata.ResourceMetrics
reader.Collect(ctx, &rm)
```

### Multiple Readers

You can use multiple readers (e.g., OTLP + Prometheus):

```go
mp := sdkmetric.NewMeterProvider(
    // Export to OTLP every 15s
    sdkmetric.WithReader(sdkmetric.NewPeriodicReader(otlpExporter,
        sdkmetric.WithInterval(15 * time.Second),
    )),
    
    // Also expose for Prometheus scraping
    sdkmetric.WithReader(prometheusExporter),
)
```

## Temporality

Temporality defines how metric values are reported over time:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEMPORALITY                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CUMULATIVE (default for counters)                                       │
│  ────────────────────────────────                                        │
│  Reports total value since start                                         │
│                                                                          │
│  Time:   t1      t2      t3      t4                                     │
│  Value:  100     250     350     500                                    │
│                                                                          │
│  Each export: "total so far is X"                                       │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DELTA (sometimes preferred)                                             │
│  ────────────────────────────                                            │
│  Reports change since last export                                        │
│                                                                          │
│  Time:   t1      t2      t3      t4                                     │
│  Value:  100     150     100     150                                    │
│                                                                          │
│  Each export: "change since last time is X"                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

Configure temporality:

```go
func preferDeltaTemporalitySelector(kind sdkmetric.InstrumentKind) metricdata.Temporality {
    switch kind {
    case sdkmetric.InstrumentKindCounter,
         sdkmetric.InstrumentKindHistogram:
        return metricdata.DeltaTemporality
    default:
        return metricdata.CumulativeTemporality
    }
}

exporter, err := otlpmetricgrpc.New(ctx,
    otlpmetricgrpc.WithTemporalitySelector(preferDeltaTemporalitySelector),
)
```

## Views

Views allow you to customize how metrics are aggregated and exported.

### Drop Unwanted Metrics

```go
mp := sdkmetric.NewMeterProvider(
    // Drop all metrics with name "unwanted_metric"
    sdkmetric.WithView(sdkmetric.NewView(
        sdkmetric.Instrument{Name: "unwanted_metric"},
        sdkmetric.Stream{Aggregation: sdkmetric.AggregationDrop{}},
    )),
)
```

### Rename Metrics

```go
mp := sdkmetric.NewMeterProvider(
    sdkmetric.WithView(sdkmetric.NewView(
        sdkmetric.Instrument{Name: "old_name"},
        sdkmetric.Stream{Name: "new_name"},
    )),
)
```

### Change Histogram Buckets

```go
mp := sdkmetric.NewMeterProvider(
    sdkmetric.WithView(sdkmetric.NewView(
        // Match all histograms
        sdkmetric.Instrument{Kind: sdkmetric.InstrumentKindHistogram},
        sdkmetric.Stream{
            Aggregation: sdkmetric.AggregationExplicitBucketHistogram{
                Boundaries: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
            },
        },
    )),
)
```

### Filter Attributes

Reduce cardinality by limiting attributes:

```go
mp := sdkmetric.NewMeterProvider(
    sdkmetric.WithView(sdkmetric.NewView(
        sdkmetric.Instrument{Name: "http_requests_*"},
        sdkmetric.Stream{
            // Only keep these attributes
            AttributeFilter: attribute.NewAllowKeysFilter(
                attribute.Key("method"),
                attribute.Key("status"),
            ),
        },
    )),
)
```

## Complete Configuration Example

Here's the full configuration from our codebase:

```go
func initMeterProvider(ctx context.Context, res *resource.Resource) (func(context.Context) error, error) {
    // Create OTLP metric exporter
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithInsecure(),
        otlpmetricgrpc.WithEndpoint(getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")),
    )
    if err != nil {
        return nil, err
    }

    // Create meter provider with periodic reader
    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithResource(res),
        sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter,
            sdkmetric.WithInterval(15*time.Second),
        )),
    )

    // Set global meter provider
    otel.SetMeterProvider(mp)

    return mp.Shutdown, nil
}
```

## Getting a Meter

Once the provider is configured, get a meter:

```go
// From global provider (most common)
meter := otel.Meter("my-service")

// With version
meter := otel.Meter("my-service",
    metric.WithInstrumentationVersion("1.0.0"),
)

// From specific provider
meter := mp.Meter("my-service")
```

## Creating Instruments

Different metric types require different instruments:

### Counter (Monotonically Increasing)

```go
// Int64 counter
requestsCounter, _ := meter.Int64Counter(
    "http_requests_total",
    metric.WithDescription("Total HTTP requests"),
    metric.WithUnit("{requests}"),
)

// Float64 counter
bytesCounter, _ := meter.Float64Counter(
    "http_bytes_sent_total",
    metric.WithDescription("Total bytes sent"),
    metric.WithUnit("By"),
)
```

### UpDownCounter (Can Increase or Decrease)

```go
// Current value that can go up or down
activeConnections, _ := meter.Int64UpDownCounter(
    "active_connections",
    metric.WithDescription("Current active connections"),
)

// Or float
queueSize, _ := meter.Float64UpDownCounter(
    "queue_size_mb",
    metric.WithDescription("Current queue size in MB"),
    metric.WithUnit("MBy"),
)
```

### Histogram (Distribution)

```go
requestDuration, _ := meter.Float64Histogram(
    "http_request_duration_seconds",
    metric.WithDescription("HTTP request duration"),
    metric.WithUnit("s"),
)
```

### Gauge (Observable Value)

Gauges are "observable" - they're called at collection time:

```go
// Register a callback that's called when metrics are collected
_, _ = meter.Int64ObservableGauge(
    "system_memory_usage_bytes",
    metric.WithDescription("Current memory usage"),
    metric.WithUnit("By"),
    metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
        // This is called every time metrics are collected
        var m runtime.MemStats
        runtime.ReadMemStats(&m)
        o.Observe(int64(m.Alloc))
        return nil
    }),
)
```

## Instrument Selection Guide

| What You Want to Measure | Instrument Type |
|-------------------------|-----------------|
| Total requests | Counter |
| Total errors | Counter |
| Total bytes processed | Counter |
| Current connections | UpDownCounter |
| Current queue size | UpDownCounter |
| Current users | UpDownCounter |
| Request latency | Histogram |
| Response size | Histogram |
| Current CPU/memory | Observable Gauge |
| Current temperature | Observable Gauge |

## Configuration Best Practices

### 1. Set Appropriate Export Interval

```go
// Production: 15-60 seconds
sdkmetric.WithInterval(15 * time.Second)

// Development: shorter for faster feedback
sdkmetric.WithInterval(5 * time.Second)
```

### 2. Use Views to Control Cardinality

```go
// Limit attributes on high-cardinality metrics
sdkmetric.WithView(sdkmetric.NewView(
    sdkmetric.Instrument{Name: "http_*"},
    sdkmetric.Stream{
        AttributeFilter: attribute.NewAllowKeysFilter(
            attribute.Key("method"),
            attribute.Key("status_code"),
            attribute.Key("route"),
        ),
    },
)),
```

### 3. Use Appropriate Units

```go
// Use base units with standard suffixes
metric.WithUnit("s")      // seconds
metric.WithUnit("ms")     // milliseconds
metric.WithUnit("By")     // bytes
metric.WithUnit("MiBy")   // mebibytes
metric.WithUnit("{requests}") // counts
metric.WithUnit("1")      // dimensionless
```

## Troubleshooting

### Metrics Not Appearing

1. **Check export interval**: Wait at least one interval
2. **Check endpoint**: Is the collector reachable?
3. **Use console exporter**: Verify metrics are being created
4. **Check shutdown**: Is `mp.Shutdown()` being called?

### High Memory Usage

1. **Reduce cardinality**: Limit unique attribute combinations
2. **Use views**: Drop unwanted metrics
3. **Check for attribute explosion**: Never use high-cardinality values like user IDs

### Missing Attributes

1. **Check attribute filters**: Views might be filtering them
2. **Verify attribute names**: Case-sensitive

## Summary

| Component | Purpose | Default |
|-----------|---------|---------|
| **Exporter** | Where to send metrics | None (must configure) |
| **Reader** | When to collect/export | Periodic, 60s interval |
| **Views** | Customize aggregation | None (use defaults) |
| **Temporality** | Cumulative vs Delta | Depends on instrument |

---

**Previous:** [← Configuring Traces](06-configuring-traces.md)

**Next:** [Configuring Logs →](08-configuring-logs.md)
