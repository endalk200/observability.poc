# Using Metrics in Go Code

This chapter covers how to create and record metrics in your Go code. You'll learn to use counters, gauges, and histograms to track the health and performance of your application.

## Getting a Meter

First, get a meter from the global provider:

```go
import "go.opentelemetry.io/otel"

// Get a meter (usually done once per package/component)
var meter = otel.Meter("my-service")

// Or with version
var meter = otel.Meter("my-service",
    metric.WithInstrumentationVersion("1.0.0"),
)
```

## Creating Instruments

Create instruments once (typically at initialization), then use them throughout your code.

### Counter (Monotonically Increasing)

Use counters for things that only go up: total requests, errors, bytes sent.

```go
import (
    "go.opentelemetry.io/otel/metric"
)

// Create at init time
var requestCounter metric.Int64Counter

func init() {
    var err error
    requestCounter, err = meter.Int64Counter(
        "http_requests_total",
        metric.WithDescription("Total number of HTTP requests"),
        metric.WithUnit("{requests}"),
    )
    if err != nil {
        log.Fatal(err)
    }
}

// Use in your code
func HandleRequest(ctx context.Context) {
    // Increment by 1
    requestCounter.Add(ctx, 1)
}
```

### UpDownCounter (Can Increase or Decrease)

Use for values that can go up and down: active connections, queue size, current users.

```go
var activeConnections metric.Int64UpDownCounter

func init() {
    var err error
    activeConnections, err = meter.Int64UpDownCounter(
        "active_connections",
        metric.WithDescription("Current number of active connections"),
        metric.WithUnit("{connections}"),
    )
    if err != nil {
        log.Fatal(err)
    }
}

// Connection opened
func OnConnect(ctx context.Context) {
    activeConnections.Add(ctx, 1)
}

// Connection closed
func OnDisconnect(ctx context.Context) {
    activeConnections.Add(ctx, -1)  // Negative value!
}
```

### Histogram (Distribution)

Use for measuring distributions: request latency, response size, queue wait time.

```go
var requestDuration metric.Float64Histogram

func init() {
    var err error
    requestDuration, err = meter.Float64Histogram(
        "http_request_duration_seconds",
        metric.WithDescription("HTTP request duration in seconds"),
        metric.WithUnit("s"),
    )
    if err != nil {
        log.Fatal(err)
    }
}

// Record request duration
func HandleRequest(ctx context.Context) {
    start := time.Now()
    
    // ... handle request ...
    
    duration := time.Since(start).Seconds()
    requestDuration.Record(ctx, duration)
}
```

### Observable Gauge (Async Measurement)

For values you measure at collection time (not when they change):

```go
func init() {
    // Register callback - called when metrics are collected
    _, err := meter.Int64ObservableGauge(
        "system_memory_usage_bytes",
        metric.WithDescription("Current memory usage"),
        metric.WithUnit("By"),
        metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
            var m runtime.MemStats
            runtime.ReadMemStats(&m)
            o.Observe(int64(m.Alloc))
            return nil
        }),
    )
    if err != nil {
        log.Fatal(err)
    }
}
```

## Adding Attributes

Attributes (labels) add dimensions to your metrics:

```go
import "go.opentelemetry.io/otel/attribute"

// Without attributes - single time series
requestCounter.Add(ctx, 1)

// With attributes - separate time series for each combination
requestCounter.Add(ctx, 1,
    metric.WithAttributes(
        attribute.String("method", "GET"),
        attribute.String("path", "/users"),
        attribute.Int("status", 200),
    ),
)
```

### Attribute Best Practices

**DO - Low Cardinality:**
```go
// Limited number of unique values
attribute.String("method", "GET")           // ~5-10 methods
attribute.String("status_class", "2xx")     // 5 classes
attribute.String("service", "user-api")     // Known services
attribute.Bool("cache_hit", true)           // 2 values
```

**DON'T - High Cardinality:**
```go
// Avoid! Creates unbounded time series
attribute.String("user_id", userID)         // Millions of users
attribute.String("request_id", reqID)       // Unique per request
attribute.String("email", user.Email)       // Unique per user
attribute.Int64("timestamp", time.Now().Unix()) // Always unique
```

## Real-World Example from Our Codebase

Here's how we define and use metrics in the User API:

```go
// handlers/user.go

type UserHandler struct {
    store  *storage.JSONStore
    logger *slog.Logger

    // Custom metrics
    userCounter    metric.Int64UpDownCounter // Current number of users
    usersCreated   metric.Int64Counter       // Total users created
    usersDeleted   metric.Int64Counter       // Total users deleted
    userOperations metric.Int64Counter       // Operations by type
}

func NewUserHandler(store *storage.JSONStore, logger *slog.Logger, meter metric.Meter) *UserHandler {
    // Initialize custom metrics
    userCounter, err := meter.Int64UpDownCounter(
        "user_api_users_total",
        metric.WithDescription("Current number of users in the system"),
        metric.WithUnit("{users}"),
    )
    if err != nil {
        logger.Error("Failed to create user counter metric", "error", err)
    }

    usersCreated, err := meter.Int64Counter(
        "user_api_users_created_total",
        metric.WithDescription("Total number of users created"),
        metric.WithUnit("{users}"),
    )
    if err != nil {
        logger.Error("Failed to create users created metric", "error", err)
    }

    usersDeleted, err := meter.Int64Counter(
        "user_api_users_deleted_total",
        metric.WithDescription("Total number of users deleted"),
        metric.WithUnit("{users}"),
    )
    if err != nil {
        logger.Error("Failed to create users deleted metric", "error", err)
    }

    userOperations, err := meter.Int64Counter(
        "user_api_operations_total",
        metric.WithDescription("Total number of user operations"),
        metric.WithUnit("{operations}"),
    )
    if err != nil {
        logger.Error("Failed to create user operations metric", "error", err)
    }

    handler := &UserHandler{
        store:          store,
        logger:         logger,
        userCounter:    userCounter,
        usersCreated:   usersCreated,
        usersDeleted:   usersDeleted,
        userOperations: userOperations,
    }

    // Set initial user count
    if users, err := store.GetAll(); err == nil {
        userCounter.Add(context.Background(), int64(len(users)))
    }

    return handler
}
```

### Using the Metrics

```go
func (h *UserHandler) GetAll(c *gin.Context) {
    ctx := c.Request.Context()
    
    // Track operation
    h.userOperations.Add(ctx, 1, 
        metric.WithAttributes(attribute.String("operation", "get_all")),
    )
    
    // ... rest of handler
}

func (h *UserHandler) Create(c *gin.Context) {
    ctx := c.Request.Context()
    
    h.userOperations.Add(ctx, 1,
        metric.WithAttributes(attribute.String("operation", "create")),
    )
    
    // ... validation and creation ...
    
    // On success:
    h.usersCreated.Add(ctx, 1)
    h.userCounter.Add(ctx, 1)
}

func (h *UserHandler) Delete(c *gin.Context) {
    ctx := c.Request.Context()
    
    h.userOperations.Add(ctx, 1,
        metric.WithAttributes(attribute.String("operation", "delete")),
    )
    
    // ... deletion logic ...
    
    // On success:
    h.usersDeleted.Add(ctx, 1)
    h.userCounter.Add(ctx, -1)  // Decrease current count
}
```

## Common Patterns

### Pattern 1: Request Metrics (RED Method)

Track Rate, Errors, and Duration:

```go
var (
    requestsTotal metric.Int64Counter
    requestErrors metric.Int64Counter
    requestDuration metric.Float64Histogram
)

func init() {
    requestsTotal, _ = meter.Int64Counter(
        "http_requests_total",
        metric.WithDescription("Total HTTP requests"),
    )
    
    requestErrors, _ = meter.Int64Counter(
        "http_request_errors_total",
        metric.WithDescription("Total HTTP request errors"),
    )
    
    requestDuration, _ = meter.Float64Histogram(
        "http_request_duration_seconds",
        metric.WithDescription("HTTP request duration"),
        metric.WithUnit("s"),
    )
}

func metricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Wrap response writer to capture status
        wrapped := &statusRecorder{ResponseWriter: w, status: 200}
        
        next.ServeHTTP(wrapped, r)
        
        // Record metrics
        attrs := metric.WithAttributes(
            attribute.String("method", r.Method),
            attribute.String("path", r.URL.Path),
            attribute.Int("status", wrapped.status),
        )
        
        requestsTotal.Add(r.Context(), 1, attrs)
        requestDuration.Record(r.Context(), time.Since(start).Seconds(), attrs)
        
        if wrapped.status >= 400 {
            requestErrors.Add(r.Context(), 1, attrs)
        }
    })
}
```

### Pattern 2: Business Metrics

Track business-relevant events:

```go
var (
    ordersPlaced metric.Int64Counter
    orderValue   metric.Float64Histogram
    ordersByType metric.Int64Counter
)

func init() {
    ordersPlaced, _ = meter.Int64Counter(
        "orders_placed_total",
        metric.WithDescription("Total orders placed"),
    )
    
    orderValue, _ = meter.Float64Histogram(
        "order_value_dollars",
        metric.WithDescription("Order value in dollars"),
        metric.WithUnit("$"),
    )
    
    ordersByType, _ = meter.Int64Counter(
        "orders_by_type_total",
        metric.WithDescription("Orders by type"),
    )
}

func placeOrder(ctx context.Context, order Order) error {
    // ... order processing ...
    
    // Record business metrics
    ordersPlaced.Add(ctx, 1)
    
    orderValue.Record(ctx, order.Total)
    
    ordersByType.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("type", order.Type),
            attribute.String("region", order.Region),
        ),
    )
    
    return nil
}
```

### Pattern 3: Cache Metrics

Track cache effectiveness:

```go
var (
    cacheHits   metric.Int64Counter
    cacheMisses metric.Int64Counter
    cacheSize   metric.Int64UpDownCounter
)

func init() {
    cacheHits, _ = meter.Int64Counter(
        "cache_hits_total",
        metric.WithDescription("Cache hits"),
    )
    
    cacheMisses, _ = meter.Int64Counter(
        "cache_misses_total",
        metric.WithDescription("Cache misses"),
    )
    
    cacheSize, _ = meter.Int64UpDownCounter(
        "cache_size_items",
        metric.WithDescription("Current cache size"),
    )
}

func (c *Cache) Get(ctx context.Context, key string) (interface{}, bool) {
    attrs := metric.WithAttributes(
        attribute.String("cache", c.name),
    )
    
    if val, ok := c.data[key]; ok {
        cacheHits.Add(ctx, 1, attrs)
        return val, true
    }
    
    cacheMisses.Add(ctx, 1, attrs)
    return nil, false
}

func (c *Cache) Set(ctx context.Context, key string, value interface{}) {
    if _, exists := c.data[key]; !exists {
        cacheSize.Add(ctx, 1,
            metric.WithAttributes(attribute.String("cache", c.name)),
        )
    }
    c.data[key] = value
}

func (c *Cache) Delete(ctx context.Context, key string) {
    if _, exists := c.data[key]; exists {
        cacheSize.Add(ctx, -1,
            metric.WithAttributes(attribute.String("cache", c.name)),
        )
        delete(c.data, key)
    }
}
```

### Pattern 4: Queue/Pool Metrics

Track queue depth and processing:

```go
var (
    queueDepth     metric.Int64UpDownCounter
    itemsProcessed metric.Int64Counter
    processingTime metric.Float64Histogram
)

func init() {
    queueDepth, _ = meter.Int64UpDownCounter(
        "job_queue_depth",
        metric.WithDescription("Current queue depth"),
    )
    
    itemsProcessed, _ = meter.Int64Counter(
        "jobs_processed_total",
        metric.WithDescription("Total jobs processed"),
    )
    
    processingTime, _ = meter.Float64Histogram(
        "job_processing_seconds",
        metric.WithDescription("Job processing time"),
        metric.WithUnit("s"),
    )
}

func (q *Queue) Enqueue(ctx context.Context, job Job) {
    q.jobs <- job
    queueDepth.Add(ctx, 1,
        metric.WithAttributes(attribute.String("queue", q.name)),
    )
}

func (q *Queue) Process(ctx context.Context) {
    for job := range q.jobs {
        queueDepth.Add(ctx, -1,
            metric.WithAttributes(attribute.String("queue", q.name)),
        )
        
        start := time.Now()
        err := job.Execute(ctx)
        duration := time.Since(start).Seconds()
        
        attrs := metric.WithAttributes(
            attribute.String("queue", q.name),
            attribute.String("job_type", job.Type),
            attribute.Bool("success", err == nil),
        )
        
        itemsProcessed.Add(ctx, 1, attrs)
        processingTime.Record(ctx, duration, attrs)
    }
}
```

## Observable (Async) Metrics

For values you measure on-demand rather than when they change:

```go
func init() {
    // CPU usage - measured at collection time
    meter.Float64ObservableGauge(
        "system_cpu_usage_percent",
        metric.WithDescription("Current CPU usage"),
        metric.WithUnit("%"),
        metric.WithFloat64Callback(func(ctx context.Context, o metric.Float64Observer) error {
            usage := getCPUUsage()
            o.Observe(usage)
            return nil
        }),
    )
    
    // Memory - measured at collection time
    meter.Int64ObservableGauge(
        "system_memory_bytes",
        metric.WithDescription("Current memory usage"),
        metric.WithUnit("By"),
        metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
            var m runtime.MemStats
            runtime.ReadMemStats(&m)
            o.Observe(int64(m.Alloc),
                metric.WithAttributes(attribute.String("type", "alloc")),
            )
            o.Observe(int64(m.Sys),
                metric.WithAttributes(attribute.String("type", "sys")),
            )
            return nil
        }),
    )
    
    // Goroutines
    meter.Int64ObservableGauge(
        "go_goroutines",
        metric.WithDescription("Current number of goroutines"),
        metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
            o.Observe(int64(runtime.NumGoroutine()))
            return nil
        }),
    )
}
```

## Summary: When to Use Each Type

| Metric Type | When to Use | Example |
|-------------|-------------|---------|
| **Counter** | Monotonically increasing values | Requests, errors, bytes |
| **UpDownCounter** | Values that increase/decrease | Queue size, connections |
| **Histogram** | Distributions, latencies | Request duration, response size |
| **Observable Gauge** | Measured at collection time | CPU%, memory, goroutines |

## Checklist

When adding a metric:

1. ✅ Choose the right type (counter/gauge/histogram)
2. ✅ Use clear, descriptive name with unit suffix
3. ✅ Add description
4. ✅ Specify unit
5. ✅ Keep attribute cardinality low
6. ✅ Create instrument once, use many times
7. ✅ Always pass context

---

**Previous:** [← Using Traces in Code](09-using-traces.md)

**Next:** [Using Logs in Code →](11-using-logs.md)
