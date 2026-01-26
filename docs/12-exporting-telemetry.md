# Exporting Telemetry

This final chapter covers how telemetry data gets from your application to observability backends. You'll learn about OTLP, collectors, and how our example infrastructure works.

## The Export Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        YOUR GO APPLICATION                               │
│                                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                    │
│  │   Traces    │   │   Metrics   │   │    Logs     │                    │
│  │  Provider   │   │  Provider   │   │  Provider   │                    │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                    │
│         │                 │                 │                            │
│         └─────────────────┼─────────────────┘                            │
│                           │                                              │
│                    ┌──────┴──────┐                                       │
│                    │    OTLP     │                                       │
│                    │  Exporters  │                                       │
│                    └──────┬──────┘                                       │
│                           │                                              │
└───────────────────────────┼──────────────────────────────────────────────┘
                            │
                     gRPC or HTTP
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         OTEL COLLECTOR                                     │
│                       (Grafana Alloy)                                      │
│                                                                            │
│   ┌───────────┐      ┌───────────┐      ┌───────────┐                     │
│   │ Receivers │──────│ Processors│──────│ Exporters │                     │
│   └───────────┘      └───────────┘      └───────────┘                     │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Prometheus  │      │   Tempo     │      │    Loki     │
│  (Metrics)  │      │  (Traces)   │      │   (Logs)    │
└─────────────┘      └─────────────┘      └─────────────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   Grafana   │
                     │ (Dashboard) │
                     └─────────────┘
```

## OTLP: The OpenTelemetry Protocol

OTLP is the standard protocol for transmitting telemetry. It supports:

- **gRPC** (port 4317) - Binary, efficient, recommended
- **HTTP** (port 4318) - Works through firewalls/proxies

### Configuring OTLP Exporters

From our application:

```go
// Trace exporter
traceExporter, _ := otlptracegrpc.New(ctx,
    otlptracegrpc.WithInsecure(),
    otlptracegrpc.WithEndpoint("localhost:4317"),
)

// Metric exporter
metricExporter, _ := otlpmetricgrpc.New(ctx,
    otlpmetricgrpc.WithInsecure(),
    otlpmetricgrpc.WithEndpoint("localhost:4317"),
)

// Log exporter
logExporter, _ := otlploggrpc.New(ctx,
    otlploggrpc.WithInsecure(),
    otlploggrpc.WithEndpoint("localhost:4317"),
)
```

### Environment Variable Configuration

OpenTelemetry supports configuration via environment variables:

```bash
# Where to send telemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317

# Or configure each signal separately
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://collector:4317
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://collector:4317
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://collector:4317

# Protocol (grpc or http/protobuf)
OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# Headers (for authentication)
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer token123

# Timeout
OTEL_EXPORTER_OTLP_TIMEOUT=30000
```

## The Collector

A collector receives, processes, and exports telemetry. Benefits:

1. **Decoupling** - App doesn't need to know about backends
2. **Processing** - Filter, transform, sample data
3. **Reliability** - Buffer during backend outages
4. **Fan-out** - Send to multiple backends

### Our Setup: Grafana Alloy

We use Grafana Alloy as our collector. Here's our configuration:

```hcl
// observability/alloy/config.alloy

// =============================================================================
// OTLP Receiver - Receives telemetry from applications
// =============================================================================
otelcol.receiver.otlp "default" {
  grpc {
    endpoint = "0.0.0.0:4317"
  }
  http {
    endpoint = "0.0.0.0:4318"
  }

  output {
    metrics = [otelcol.processor.batch.default.input]
    traces  = [otelcol.processor.batch.default.input]
    logs    = [otelcol.processor.batch.default.input]
  }
}

// =============================================================================
// Batch Processor - Batches telemetry for efficient export
// =============================================================================
otelcol.processor.batch "default" {
  output {
    metrics = [otelcol.exporter.prometheus.default.input]
    traces  = [otelcol.exporter.otlp.tempo.input]
    logs    = [otelcol.exporter.loki.default.input]
  }
}

// =============================================================================
// Exporters - Send to backends
// =============================================================================

// Metrics → Prometheus
otelcol.exporter.prometheus "default" {
  forward_to = [prometheus.remote_write.default.receiver]
}

prometheus.remote_write "default" {
  endpoint {
    url = "http://prometheus:9090/api/v1/write"
  }
}

// Traces → Tempo
otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "tempo:4317"
    tls {
      insecure = true
    }
  }
}

// Logs → Loki
otelcol.exporter.loki "default" {
  forward_to = [loki.write.default.receiver]
}

loki.write "default" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

## Data Flow Explanation

### 1. Application Sends Data

Your Go application sends telemetry via OTLP:

```go
// In docker-compose.yml
environment:
  - OTEL_EXPORTER_OTLP_ENDPOINT=alloy:4317
```

### 2. Collector Receives

Alloy's OTLP receiver accepts the data:

```hcl
otelcol.receiver.otlp "default" {
  grpc { endpoint = "0.0.0.0:4317" }
}
```

### 3. Collector Processes

The batch processor groups telemetry for efficient export:

```hcl
otelcol.processor.batch "default" {
  // Batches data before forwarding
}
```

### 4. Collector Exports

Different exporters send to appropriate backends:

```
Metrics  ──► Prometheus (time-series database)
Traces   ──► Tempo (distributed tracing backend)  
Logs     ──► Loki (log aggregation)
```

### 5. Grafana Visualizes

Grafana queries all backends to show dashboards:

```yaml
# observability/grafana/provisioning/datasources/datasources.yml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    
  - name: Loki
    type: loki
    url: http://loki:3100
```

## Docker Compose Setup

Our complete infrastructure:

```yaml
# docker-compose.yml

services:
  # Your application
  user-api:
    build: .
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=alloy:4317
    depends_on:
      - alloy

  # Collector
  alloy:
    image: grafana/alloy:latest
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "12345:12345" # Alloy UI
    volumes:
      - ./observability/alloy/config.alloy:/etc/alloy/config.alloy

  # Metrics storage
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    command:
      - '--web.enable-remote-write-receiver'  # Accept data from Alloy

  # Traces storage
  tempo:
    image: grafana/tempo:2.6.1
    ports:
      - "3200:3200"

  # Logs storage
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  # Visualization
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
      - loki
      - tempo
```

## Alternative: Direct Export

You can also export directly to backends (no collector):

```go
// Direct to Jaeger (traces)
jaegerExporter, _ := jaeger.New(
    jaeger.WithCollectorEndpoint(
        jaeger.WithEndpoint("http://jaeger:14268/api/traces"),
    ),
)

// Direct to Prometheus (metrics via HTTP handler)
promExporter, _ := prometheus.New()
http.Handle("/metrics", promhttp.Handler())
```

**When to use direct export:**
- Simple setups
- Development/testing
- Single backend per signal type

**When to use a collector:**
- Production environments
- Multiple backends
- Need for processing/filtering
- Want buffering/reliability

## Verifying the Pipeline

### 1. Check Application Logs

```bash
docker logs user-api
# Should see: "Starting User API server"
```

### 2. Check Collector

```bash
# Alloy UI
open http://localhost:12345

# Or check logs
docker logs alloy
```

### 3. Check Backends

```bash
# Prometheus (metrics)
open http://localhost:9090

# Tempo (traces) - via Grafana
open http://localhost:3000

# Loki (logs) - via Grafana
open http://localhost:3000
```

### 4. Make Test Requests

```bash
# Create a user
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com"}'

# List users
curl http://localhost:8080/users
```

### 5. View in Grafana

1. Open http://localhost:3000 (admin/admin)
2. Go to Explore
3. Select data source:
   - **Prometheus** - Query metrics
   - **Tempo** - Search traces
   - **Loki** - Search logs

## Troubleshooting Export Issues

### Telemetry Not Appearing

1. **Check connectivity:**
   ```bash
   # From app container
   docker exec user-api nc -zv alloy 4317
   ```

2. **Check collector logs:**
   ```bash
   docker logs alloy 2>&1 | grep -i error
   ```

3. **Enable debug logging:**
   ```bash
   OTEL_LOG_LEVEL=debug
   ```

4. **Verify endpoint configuration:**
   ```go
   fmt.Println("OTLP Endpoint:", os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))
   ```

### High Latency

1. **Use batch processing:** Already configured in our setup
2. **Increase batch size:** Adjust in MeterProvider
3. **Use compression:** `WithCompressor("gzip")`

### Data Loss

1. **Check shutdown:** Ensure `Shutdown()` is called
2. **Increase timeouts:** `WithTimeout(60 * time.Second)`
3. **Enable retry:** Already enabled in our exporters

## Summary

| Component | Purpose | Protocol |
|-----------|---------|----------|
| **OTLP Exporter** | Send from app | gRPC/HTTP |
| **Collector** | Receive, process, export | Various |
| **Prometheus** | Store metrics | Remote Write |
| **Tempo** | Store traces | OTLP |
| **Loki** | Store logs | Push API |
| **Grafana** | Visualize | Query APIs |

## Key Takeaways

1. **OTLP is the standard** - Use it for sending telemetry
2. **Collectors add value** - Processing, buffering, fan-out
3. **Environment variables** - Standard way to configure exporters
4. **Graceful shutdown** - Always call `Shutdown()` to flush data
5. **Verify the pipeline** - Check each component when troubleshooting

## What's Next?

Congratulations! You've learned:

1. ✅ What logs, traces, and metrics are
2. ✅ How OpenTelemetry works
3. ✅ How to configure providers in Go
4. ✅ How to instrument your code
5. ✅ How telemetry gets exported

**Suggested next steps:**
- Create custom dashboards in Grafana
- Set up alerts based on metrics
- Explore trace analysis in Tempo
- Learn PromQL for metric queries
- Explore LogQL for log queries

---

**Previous:** [← Using Logs in Code](11-using-logs.md)

**Back to:** [Introduction](00-introduction.md)
