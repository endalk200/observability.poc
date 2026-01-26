# Understanding Traces and Spans

Distributed tracing is one of the most powerful tools for understanding how requests flow through your system. In this chapter, we'll dive deep into traces, spans, and how they help you debug performance issues and errors.

## The Problem Traces Solve

Imagine you have an e-commerce application with this architecture:

```
User Request
     │
     ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   API       │───►│   Order     │───►│  Inventory  │
│   Gateway   │    │   Service   │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
                         │
                         ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  Payment    │───►│   Email     │
                   │  Service    │    │   Service   │
                   └─────────────┘    └─────────────┘
```

A user reports: "My order took 10 seconds to complete. Why?"

Without tracing, you'd have to:
1. Check logs in each service (5+ services)
2. Try to correlate timestamps manually
3. Guess which service was slow
4. Hope the logs have enough detail

With tracing, you can see:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Trace: Create Order (Total: 10.2s)                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  API Gateway: /orders POST                                               │
│  ├─────────────────────────────────────────────────────────────────────► │
│  │                                                     (10.2s total)     │
│  │                                                                       │
│  │  Order Service: CreateOrder                                           │
│  │  ├───────────────────────────────────────────────────────────────►   │
│  │  │                                                (10.0s)             │
│  │  │                                                                    │
│  │  │  │ Order Service: ValidateOrder                                    │
│  │  │  ├──►                                          (50ms)              │
│  │  │                                                                    │
│  │  │  │ Inventory Service: CheckStock                                   │
│  │  │  ├────►                                        (200ms)             │
│  │  │                                                                    │
│  │  │  │ Payment Service: ProcessPayment        ◄── HERE'S THE PROBLEM! │
│  │  │  ├────────────────────────────────────────►    (9.5s!!!)          │
│  │  │                                                                    │
│  │  │  │ Email Service: SendConfirmation                                 │
│  │  │  ├──►                                          (100ms)             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

Instantly, you can see the Payment Service took 9.5 seconds!

## What is a Trace?

A **trace** represents the entire journey of a request through your system. It's like a story of everything that happened to fulfill that request.

Key properties of a trace:
- Has a unique **Trace ID** (e.g., `abc123def456`)
- Contains one or more **spans**
- Represents a single logical operation (e.g., "user places order")
- Can span multiple services, processes, or even data centers

## What is a Span?

A **span** represents a single unit of work within a trace. Think of it as one "step" in the request journey.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SPAN ANATOMY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Span Name: "HTTP GET /users/42"                                        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Trace ID:    abc123def456789                                    │    │
│  │ Span ID:     span-001                                           │    │
│  │ Parent ID:   (none - this is the root span)                     │    │
│  │ Start Time:  2024-01-15T10:30:45.000Z                          │    │
│  │ End Time:    2024-01-15T10:30:45.052Z                          │    │
│  │ Duration:    52ms                                               │    │
│  │ Status:      OK                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Attributes:                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ http.method:      GET                                           │    │
│  │ http.url:         /users/42                                     │    │
│  │ http.status_code: 200                                           │    │
│  │ user.id:          42                                            │    │
│  │ service.name:     user-api                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Events:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 10:30:45.010Z - "Cache miss, querying database"                 │    │
│  │ 10:30:45.045Z - "User found"                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Span Components

| Component | Description | Example |
|-----------|-------------|---------|
| **Trace ID** | Unique ID for the entire trace | `abc123def456789` |
| **Span ID** | Unique ID for this span | `span-001` |
| **Parent Span ID** | ID of the parent span (if any) | `parent-span-001` |
| **Name** | Human-readable operation name | `HTTP GET /users/{id}` |
| **Start/End Time** | When the operation started and ended | Timestamps |
| **Duration** | How long the operation took | `52ms` |
| **Status** | OK, Error, or Unset | `OK` |
| **Attributes** | Key-value metadata | `http.status_code: 200` |
| **Events** | Timestamped annotations | `"Cache miss"` |
| **Links** | References to other spans | Connection to related traces |

## Span Relationships: Parent and Child

Spans form a tree structure. Each span (except the root) has a parent:

```
                    Root Span
                 HTTP POST /orders
                    (trace start)
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      Child Span    Child Span    Child Span
    ValidateOrder  CheckInventory  ProcessPayment
          │                             │
          │                             │
          ▼                             ▼
      Grandchild                   Grandchild
    ValidateAddress              ChargeCard
```

In code, this looks like:

```go
// Root span - created automatically by HTTP middleware
// Parent: none
func CreateOrder(ctx context.Context) {
    // Child span 1
    validateOrder(ctx)
    
    // Child span 2  
    checkInventory(ctx)
    
    // Child span 3
    processPayment(ctx)
}

func processPayment(ctx context.Context) {
    // Grandchild span (child of processPayment)
    chargeCard(ctx)
}
```

## Span Types (Span Kind)

Spans have a "kind" that describes their role:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SPAN KINDS                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CLIENT ──────────►  Makes a request to another service                 │
│                      Example: HTTP client calling external API          │
│                                                                          │
│  SERVER ──────────►  Handles an incoming request                        │
│                      Example: HTTP server processing a request          │
│                                                                          │
│  INTERNAL ────────►  Internal operation, not crossing boundaries        │
│                      Example: Function call within the same service     │
│                                                                          │
│  PRODUCER ────────►  Creates a message for async processing             │
│                      Example: Publishing to a message queue             │
│                                                                          │
│  CONSUMER ────────►  Receives and processes async messages              │
│                      Example: Processing message from queue             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### How Span Kinds Work Together

```
Service A                              Service B
┌─────────────────────┐               ┌─────────────────────┐
│                     │               │                     │
│  ┌───────────────┐  │   HTTP        │  ┌───────────────┐  │
│  │ CLIENT Span   │──┼──────────────►│  │ SERVER Span   │  │
│  │ "Call User    │  │               │  │ "Handle GET   │  │
│  │  Service"     │  │               │  │  /users"      │  │
│  └───────────────┘  │               │  └───────────────┘  │
│                     │               │         │          │
│                     │               │         ▼          │
│                     │               │  ┌───────────────┐  │
│                     │               │  │ INTERNAL Span │  │
│                     │               │  │ "Query DB"    │  │
│                     │               │  └───────────────┘  │
│                     │               │                     │
└─────────────────────┘               └─────────────────────┘
```

## Context Propagation

For traces to work across services, the trace context must be passed along. This is called **context propagation**.

```
Service A                                    Service B
┌────────────────────────────────┐          ┌────────────────────────────────┐
│                                │          │                                │
│  Trace ID: abc123              │          │  Trace ID: abc123 (same!)      │
│  Span ID: span-001             │          │  Span ID: span-002 (new)       │
│                                │          │  Parent: span-001              │
│  HTTP Request ─────────────────┼─────────►│                                │
│  Headers:                      │          │  Extracts trace context        │
│  traceparent: 00-abc123-001-01 │          │  from headers                  │
│                                │          │                                │
└────────────────────────────────┘          └────────────────────────────────┘
```

The W3C Trace Context standard defines the header format:

```
traceparent: 00-{trace-id}-{parent-span-id}-{flags}
traceparent: 00-abc123def456789abcdef-001abc-01
```

In Go with OpenTelemetry, this happens automatically when you use the right HTTP clients and middleware.

## Span Attributes

Attributes are key-value pairs that add context to spans:

### Semantic Conventions

OpenTelemetry defines standard attribute names for common scenarios:

```go
// HTTP attributes
"http.method":      "GET"
"http.url":         "https://api.example.com/users/42"
"http.status_code": 200
"http.route":       "/users/{id}"

// Database attributes
"db.system":        "postgresql"
"db.name":          "users_db"
"db.operation":     "SELECT"
"db.statement":     "SELECT * FROM users WHERE id = $1"

// Custom business attributes
"user.id":          "42"
"order.total":      99.99
"feature.flag":     "new-checkout"
```

### Adding Attributes in Go

```go
span := trace.SpanFromContext(ctx)

// Add single attribute
span.SetAttributes(attribute.String("user.id", userID))

// Add multiple attributes
span.SetAttributes(
    attribute.String("order.id", orderID),
    attribute.Float64("order.total", total),
    attribute.Int("order.items_count", len(items)),
)
```

## Span Events

Events are timestamped annotations within a span. Use them to mark significant moments:

```go
span := trace.SpanFromContext(ctx)

// Add an event
span.AddEvent("Cache lookup started")

// ... some operation ...

span.AddEvent("Cache miss, querying database")

// ... database query ...

span.AddEvent("User retrieved from database",
    trace.WithAttributes(
        attribute.String("user.id", user.ID),
        attribute.Int("query_duration_ms", elapsed),
    ),
)
```

Timeline view:
```
Span: GetUser (total: 45ms)
├── 0ms:  "Cache lookup started"
├── 5ms:  "Cache miss, querying database"  
├── 40ms: "User retrieved from database" (user.id=42, query_duration_ms=35)
└── 45ms: Span ends
```

## Span Status

Every span has a status indicating success or failure:

```go
// Success (implicit - OK is the default for successful operations)
span.SetStatus(codes.Ok, "")

// Error
span.SetStatus(codes.Error, "User not found")

// Recording errors with full details
if err != nil {
    span.RecordError(err)  // Adds error as an event with stack trace
    span.SetStatus(codes.Error, err.Error())
}
```

## Real-World Trace Example

Let's look at how a trace might look for our User API when handling a `GET /users/42` request:

```
Trace ID: 8a3c60f7d0e5b2a1c4f8e9d7b6a5c4d3

┌─────────────────────────────────────────────────────────────────────────────┐
│ Span: HTTP GET /users/:id                                                    │
│ Duration: 52ms | Status: OK                                                  │
│ Attributes:                                                                  │
│   http.method: GET                                                           │
│   http.route: /users/:id                                                     │
│   http.status_code: 200                                                      │
│   user.id: 42                                                                │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Span: GetByID (child)                                                    │ │
│ │ Duration: 45ms | Status: OK                                              │ │
│ │ Attributes:                                                              │ │
│ │   user.id: 42                                                            │ │
│ │ Events:                                                                  │ │
│ │   - "Fetching user from storage" (0ms)                                   │ │
│ │   - "User found" (45ms)                                                  │ │
│ │                                                                          │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Span: storage.ReadFile (child)                                      │ │ │
│ │ │ Duration: 40ms | Status: OK                                         │ │ │
│ │ │ Attributes:                                                         │ │ │
│ │ │   file.path: /data/users.json                                       │ │ │
│ │ │   file.size: 2048                                                   │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Common Tracing Patterns

### 1. Automatic Instrumentation

Let middleware/libraries create spans automatically:

```go
// Gin middleware creates spans for every HTTP request
router.Use(otelgin.Middleware(serviceName))
```

### 2. Manual Instrumentation

Create your own spans for business operations:

```go
func ProcessOrder(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "ProcessOrder")
    defer span.End()
    
    // ... business logic ...
    
    return nil
}
```

### 3. Wrapping External Calls

```go
func callExternalAPI(ctx context.Context) (*Response, error) {
    ctx, span := tracer.Start(ctx, "external.api.call",
        trace.WithSpanKind(trace.SpanKindClient),
    )
    defer span.End()
    
    span.SetAttributes(
        attribute.String("http.url", "https://api.external.com"),
    )
    
    // ... make the call ...
}
```

## Summary

| Concept | Description |
|---------|-------------|
| **Trace** | Complete journey of a request through the system |
| **Span** | Single unit of work within a trace |
| **Trace ID** | Unique identifier linking all spans in a trace |
| **Span ID** | Unique identifier for a single span |
| **Parent Span** | The span that created this span |
| **Attributes** | Key-value metadata on spans |
| **Events** | Timestamped annotations within spans |
| **Status** | OK or Error indication |
| **Context Propagation** | Passing trace context across service boundaries |

## Key Takeaways

1. **Traces show the "how"** - They reveal the complete path of a request
2. **Spans are hierarchical** - Parent-child relationships show call chains
3. **Context must propagate** - Use standard headers for cross-service tracing
4. **Add meaningful attributes** - They make traces searchable and useful
5. **Record errors** - Use `RecordError` and set status on failures

---

**Previous:** [← Understanding Logs](01-concepts-logs.md)

**Next:** [Understanding Metrics →](03-concepts-metrics.md)
