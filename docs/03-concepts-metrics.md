# Understanding Metrics

Metrics are numerical measurements that tell you about the health and performance of your system over time. Unlike logs (discrete events) or traces (request journeys), metrics are aggregated data points that answer questions like "How many?", "How much?", and "How fast?".

## What Are Metrics?

A metric is a numerical value that represents some aspect of your system at a point in time (or over a time period):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         METRIC EXAMPLE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Name:       http_requests_total                                         │
│  Type:       Counter                                                     │
│  Value:      15,234                                                      │
│  Timestamp:  2024-01-15T10:30:00Z                                       │
│  Labels:                                                                 │
│    - service: user-api                                                   │
│    - method: GET                                                         │
│    - status: 200                                                         │
│    - path: /users                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why Metrics Matter

Metrics are essential for:

1. **Alerting**: "CPU usage > 90% for 5 minutes → alert"
2. **Dashboards**: Visualizing system health at a glance
3. **Capacity Planning**: Understanding growth trends
4. **SLOs/SLAs**: Measuring service level objectives
5. **Cost Optimization**: Identifying resource inefficiencies

```
                    Metrics Use Cases

  REAL-TIME MONITORING              TREND ANALYSIS
  ┌─────────────────────┐          ┌─────────────────────┐
  │ Is the system       │          │ Is traffic          │
  │ healthy RIGHT NOW?  │          │ growing over time?  │
  └─────────────────────┘          └─────────────────────┘
           │                                │
           ▼                                ▼
  ┌─────────────────────┐          ┌─────────────────────┐
  │ Error rate: 0.1%    │          │ Requests/day chart  │
  │ Latency p99: 200ms  │          │ showing growth      │
  │ CPU: 45%            │          │ trend over weeks    │
  └─────────────────────┘          └─────────────────────┘
           │                                │
           ▼                                ▼
     ALERTING                         CAPACITY PLANNING
```

## The Three Types of Metrics

OpenTelemetry (and most metric systems) support three fundamental metric types:

### 1. Counter

A **counter** is a value that only goes up (or resets to zero on restart).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            COUNTER                                       │
│                     "How many times did X happen?"                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Value can only: INCREASE or RESET to 0                                  │
│                                                                          │
│      ^                                                                   │
│      │                                         ╱                         │
│      │                                    ╱                              │
│  1000│                               ╱                                   │
│      │                          ╱                                        │
│      │                     ╱                                             │
│   500│                ╱                                                  │
│      │           ╱                                                       │
│      │      ╱                                                            │
│      │ ╱                                                                 │
│    0 └──────────────────────────────────────────────► time               │
│                                                                          │
│  Examples:                                                               │
│  - http_requests_total (total requests received)                         │
│  - errors_total (total errors occurred)                                  │
│  - users_created_total (total users created)                             │
│  - bytes_sent_total (total bytes transmitted)                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Use counters for:**
- Total number of requests
- Total number of errors
- Total bytes processed
- Total items created/deleted

**Go Example:**
```go
// Define a counter
requestsCounter, _ := meter.Int64Counter(
    "http_requests_total",
    metric.WithDescription("Total number of HTTP requests"),
)

// Increment by 1
requestsCounter.Add(ctx, 1)

// Increment with attributes
requestsCounter.Add(ctx, 1, 
    metric.WithAttributes(
        attribute.String("method", "GET"),
        attribute.Int("status", 200),
    ),
)
```

### 2. Gauge (UpDownCounter)

A **gauge** represents a current value that can go up AND down.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            GAUGE                                         │
│                      "What is the current value of X?"                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Value can: INCREASE or DECREASE                                         │
│                                                                          │
│      ^                                                                   │
│      │           ╱╲                                                      │
│      │          ╱  ╲      ╱╲                                            │
│   80 │         ╱    ╲    ╱  ╲                                           │
│      │        ╱      ╲  ╱    ╲    ╱╲                                    │
│      │       ╱        ╲╱      ╲  ╱  ╲                                   │
│   40 │      ╱                  ╲╱    ╲                                  │
│      │     ╱                          ╲                                 │
│      │    ╱                            ╲                                │
│      │   ╱                                                              │
│    0 └──────────────────────────────────────────────► time               │
│                                                                          │
│  Examples:                                                               │
│  - temperature (current temperature)                                     │
│  - active_connections (current open connections)                         │
│  - queue_size (current items in queue)                                   │
│  - memory_usage_bytes (current memory used)                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Use gauges for:**
- Current queue size
- Current active connections
- Current temperature
- Current number of items (users, orders, etc.)
- Memory/CPU usage

**Go Example:**
```go
// Define an up-down counter (gauge)
activeUsers, _ := meter.Int64UpDownCounter(
    "active_users",
    metric.WithDescription("Current number of active users"),
)

// User logs in - increase
activeUsers.Add(ctx, 1)

// User logs out - decrease
activeUsers.Add(ctx, -1)
```

### 3. Histogram

A **histogram** measures the distribution of values, especially useful for latencies.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HISTOGRAM                                      │
│              "What is the distribution of X values?"                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Tracks: COUNT, SUM, and DISTRIBUTION of values                          │
│                                                                          │
│  Request Latency Distribution:                                           │
│                                                                          │
│  Count│                                                                  │
│       │        ████                                                      │
│  1000 │        ████                                                      │
│       │        ████                                                      │
│   800 │   ████ ████                                                      │
│       │   ████ ████                                                      │
│   600 │   ████ ████ ████                                                 │
│       │   ████ ████ ████                                                 │
│   400 │   ████ ████ ████ ████                                            │
│       │   ████ ████ ████ ████                                            │
│   200 │   ████ ████ ████ ████ ████                                       │
│       │   ████ ████ ████ ████ ████ ████                                  │
│     0 └───────────────────────────────────────────► latency (ms)         │
│           10   25   50   100  250  500  1000                            │
│                                                                          │
│  From this, calculate:                                                   │
│  - Average latency: 45ms                                                 │
│  - p50 (median): 25ms                                                    │
│  - p95: 200ms                                                            │
│  - p99: 500ms                                                            │
│                                                                          │
│  Examples:                                                               │
│  - request_duration_seconds                                              │
│  - response_size_bytes                                                   │
│  - db_query_duration_seconds                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Use histograms for:**
- Request latencies
- Response sizes
- Queue wait times
- Any value where you care about distribution, not just average

**Go Example:**
```go
// Define a histogram
requestDuration, _ := meter.Float64Histogram(
    "http_request_duration_seconds",
    metric.WithDescription("HTTP request duration in seconds"),
    metric.WithUnit("s"),
)

// Record a value
start := time.Now()
// ... handle request ...
duration := time.Since(start).Seconds()
requestDuration.Record(ctx, duration,
    metric.WithAttributes(
        attribute.String("method", "GET"),
        attribute.String("path", "/users"),
    ),
)
```

## Metric Types Comparison

| Type | Direction | Use Case | Example |
|------|-----------|----------|---------|
| **Counter** | Only up | Counting events | Total requests |
| **Gauge** | Up and down | Current state | Active connections |
| **Histogram** | Distribution | Latencies, sizes | Request duration |

## Labels (Attributes)

Labels (called "attributes" in OpenTelemetry) add dimensions to your metrics:

```
Without labels:
  http_requests_total = 15,234
  
With labels:
  http_requests_total{method="GET", path="/users", status="200"} = 10,000
  http_requests_total{method="GET", path="/users", status="404"} = 234
  http_requests_total{method="POST", path="/users", status="201"} = 5,000
```

This lets you:
- Filter: "Show only GET requests"
- Group: "Show requests grouped by status code"
- Analyze: "Which endpoint has the most errors?"

### Label Best Practices

**DO:**
```go
// Low cardinality labels (limited unique values)
attribute.String("method", "GET")       // ~5-10 values
attribute.String("status", "200")       // ~10-20 values
attribute.String("service", "user-api") // Known services
```

**DON'T:**
```go
// High cardinality labels (infinite unique values) - AVOID!
attribute.String("user_id", userID)     // Millions of users!
attribute.String("request_id", reqID)   // Unique per request!
attribute.String("timestamp", time.Now().String()) // Always unique!
```

High cardinality labels can:
- Explode your metric storage
- Slow down queries
- Increase costs significantly

## Common Metric Patterns

### The RED Method (Request-focused)

For services that handle requests:

```
R - Rate:       Requests per second
E - Errors:     Errors per second  
D - Duration:   Request latency
```

```go
// Rate
requestsTotal, _ := meter.Int64Counter("http_requests_total")

// Errors
errorsTotal, _ := meter.Int64Counter("http_errors_total")

// Duration
requestDuration, _ := meter.Float64Histogram("http_request_duration_seconds")
```

### The USE Method (Resource-focused)

For infrastructure resources (CPU, memory, disk):

```
U - Utilization:  % of resource being used
S - Saturation:   Work that can't be serviced
E - Errors:       Error events
```

```go
// Utilization
cpuUsage, _ := meter.Float64Gauge("cpu_usage_percent")

// Saturation  
queueLength, _ := meter.Int64UpDownCounter("request_queue_length")

// Errors
diskErrors, _ := meter.Int64Counter("disk_errors_total")
```

### The Four Golden Signals (Google SRE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE FOUR GOLDEN SIGNALS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. LATENCY                                                              │
│     How long requests take                                               │
│     Metric: http_request_duration_seconds (histogram)                    │
│                                                                          │
│  2. TRAFFIC                                                              │
│     How much demand is being placed on the system                        │
│     Metric: http_requests_total (counter)                                │
│                                                                          │
│  3. ERRORS                                                               │
│     Rate of failed requests                                              │
│     Metric: http_errors_total (counter)                                  │
│                                                                          │
│  4. SATURATION                                                           │
│     How "full" the system is                                             │
│     Metric: queue_length, cpu_usage, memory_usage                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Metric Naming Conventions

Follow these conventions for consistent, understandable metrics:

```
<namespace>_<name>_<unit>

Examples:
  http_requests_total           (counter, no unit needed for "total")
  http_request_duration_seconds (histogram, unit is seconds)
  process_memory_bytes          (gauge, unit is bytes)
  db_connections_active         (gauge, describes what it measures)
```

### Naming Rules

| Rule | Good | Bad |
|------|------|-----|
| Use snake_case | `http_requests_total` | `httpRequestsTotal` |
| Include unit | `request_duration_seconds` | `request_duration` |
| Use `_total` suffix for counters | `errors_total` | `error_count` |
| Be specific | `db_query_duration_seconds` | `duration` |
| Use base units | `_seconds`, `_bytes` | `_milliseconds`, `_kilobytes` |

## Aggregation and Queries

Metrics are powerful because you can aggregate them:

```
Raw metric points:
  09:00:00  http_requests_total{status="200"} = 100
  09:00:15  http_requests_total{status="200"} = 115
  09:00:30  http_requests_total{status="200"} = 132
  09:00:45  http_requests_total{status="200"} = 150
  09:01:00  http_requests_total{status="200"} = 165

Queries:
  
  Rate (requests per second):
    rate(http_requests_total[1m]) = 1.08 req/s
  
  Increase (total increase over time):
    increase(http_requests_total[1m]) = 65 requests
  
  Percentage (success rate):
    sum(rate(http_requests_total{status="200"}[5m])) / 
    sum(rate(http_requests_total[5m])) * 100 = 99.2%
```

## Real-World Example from This Codebase

Looking at our User API, here are the custom metrics we track:

```go
// Current number of users (gauge)
userCounter, _ := meter.Int64UpDownCounter(
    "user_api_users_total",
    metric.WithDescription("Current number of users in the system"),
)

// Total users created (counter)
usersCreated, _ := meter.Int64Counter(
    "user_api_users_created_total", 
    metric.WithDescription("Total number of users created"),
)

// Total users deleted (counter)
usersDeleted, _ := meter.Int64Counter(
    "user_api_users_deleted_total",
    metric.WithDescription("Total number of users deleted"),
)

// Operations by type (counter with labels)
userOperations, _ := meter.Int64Counter(
    "user_api_operations_total",
    metric.WithDescription("Total number of user operations"),
)
```

Usage:
```go
// When a user is created
h.usersCreated.Add(ctx, 1)
h.userCounter.Add(ctx, 1)

// When a user is deleted
h.usersDeleted.Add(ctx, 1)
h.userCounter.Add(ctx, -1)

// Track operations with labels
h.userOperations.Add(ctx, 1, 
    metric.WithAttributes(attribute.String("operation", "create")),
)
```

## Summary

| Concept | Description |
|---------|-------------|
| **Counter** | Monotonically increasing value (total requests) |
| **Gauge** | Value that goes up and down (current connections) |
| **Histogram** | Distribution of values (latency percentiles) |
| **Labels/Attributes** | Dimensions for filtering and grouping |
| **RED Method** | Rate, Errors, Duration |
| **USE Method** | Utilization, Saturation, Errors |

## Key Takeaways

1. **Choose the right type** - Counter for totals, Gauge for current state, Histogram for distributions
2. **Use meaningful labels** - But keep cardinality low
3. **Follow naming conventions** - Include units, use snake_case
4. **Track the golden signals** - Latency, Traffic, Errors, Saturation
5. **Aggregate wisely** - Rate over time, percentiles for latency

---

**Previous:** [← Understanding Traces and Spans](02-concepts-traces.md)

**Next:** [OpenTelemetry Architecture →](04-opentelemetry-architecture.md)
