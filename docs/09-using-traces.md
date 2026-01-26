# Using Traces in Go Code

Now that you've configured tracing, let's learn how to create spans, add attributes, record events, and handle errors. This chapter shows practical patterns for instrumenting your Go code.

## Getting a Tracer

First, get a tracer from the global provider:

```go
import "go.opentelemetry.io/otel"

// Get a tracer (usually done once per package/component)
var tracer = otel.Tracer("my-service")

// Or with version
var tracer = otel.Tracer("my-service",
    trace.WithInstrumentationVersion("1.0.0"),
)
```

## Creating Spans

### Basic Span Creation

```go
import (
    "context"
    "go.opentelemetry.io/otel"
)

func ProcessOrder(ctx context.Context, orderID string) error {
    // Start a new span
    ctx, span := tracer.Start(ctx, "ProcessOrder")
    defer span.End()  // Always end the span!
    
    // Your business logic here
    // ...
    
    return nil
}
```

**Critical**: Always call `span.End()` - use `defer` to ensure it's called even if the function returns early or panics.

### Span Naming Conventions

Use clear, descriptive names that indicate the operation:

```go
// Good - describes the operation
tracer.Start(ctx, "GetUserByID")
tracer.Start(ctx, "ProcessPayment")
tracer.Start(ctx, "SendEmailNotification")
tracer.Start(ctx, "ValidateOrderItems")

// Bad - too vague
tracer.Start(ctx, "process")
tracer.Start(ctx, "handler")
tracer.Start(ctx, "doWork")
```

For HTTP handlers, follow the convention `HTTP <METHOD> <route>`:

```go
tracer.Start(ctx, "HTTP GET /users/:id")
tracer.Start(ctx, "HTTP POST /orders")
```

## Adding Attributes

Attributes add context to spans, making them searchable and useful:

```go
import (
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

func GetUser(ctx context.Context, userID string) (*User, error) {
    ctx, span := tracer.Start(ctx, "GetUser")
    defer span.End()
    
    // Add attributes after span creation
    span.SetAttributes(
        attribute.String("user.id", userID),
    )
    
    user, err := db.FindUser(userID)
    if err != nil {
        return nil, err
    }
    
    // Add more attributes as you learn more
    span.SetAttributes(
        attribute.String("user.email", user.Email),
        attribute.String("user.plan", user.Plan),
    )
    
    return user, nil
}
```

### Common Attribute Types

```go
import "go.opentelemetry.io/otel/attribute"

// String
attribute.String("user.email", "john@example.com")

// Int/Int64
attribute.Int("http.status_code", 200)
attribute.Int64("order.total_cents", 9999)

// Float64
attribute.Float64("process.duration_seconds", 1.234)

// Bool
attribute.Bool("cache.hit", true)

// String slice
attribute.StringSlice("tags", []string{"important", "urgent"})

// Int slice
attribute.IntSlice("item.quantities", []int{1, 2, 3})
```

### Using Semantic Conventions

OpenTelemetry provides standard attribute names:

```go
import semconv "go.opentelemetry.io/otel/semconv/v1.27.0"

span.SetAttributes(
    // HTTP
    semconv.HTTPMethod("GET"),
    semconv.HTTPRoute("/users/:id"),
    semconv.HTTPStatusCode(200),
    
    // Database
    semconv.DBSystemPostgreSQL,
    semconv.DBName("users"),
    semconv.DBOperation("SELECT"),
    
    // General
    semconv.ServiceName("user-api"),
)
```

## Recording Events

Events are timestamped annotations within a span:

```go
func ProcessPayment(ctx context.Context, payment Payment) error {
    ctx, span := tracer.Start(ctx, "ProcessPayment")
    defer span.End()
    
    // Event: payment validation started
    span.AddEvent("Validating payment details")
    
    if err := validatePayment(payment); err != nil {
        span.AddEvent("Payment validation failed",
            trace.WithAttributes(
                attribute.String("error", err.Error()),
            ),
        )
        return err
    }
    
    // Event with attributes
    span.AddEvent("Charging payment provider",
        trace.WithAttributes(
            attribute.String("provider", "stripe"),
            attribute.Float64("amount", payment.Amount),
            attribute.String("currency", payment.Currency),
        ),
    )
    
    // Call payment provider
    result, err := chargePayment(payment)
    
    span.AddEvent("Payment processed",
        trace.WithAttributes(
            attribute.Bool("success", err == nil),
            attribute.String("transaction_id", result.TransactionID),
        ),
    )
    
    return err
}
```

### When to Use Events vs Attributes

| Use Case | Events | Attributes |
|----------|--------|------------|
| Key characteristics | ❌ | ✅ |
| Timestamps matter | ✅ | ❌ |
| Single value | ❌ | ✅ |
| Multiple occurrences | ✅ | ❌ |
| Debug points | ✅ | ❌ |

## Handling Errors

Always record errors on spans:

```go
import (
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

func CreateUser(ctx context.Context, user User) error {
    ctx, span := tracer.Start(ctx, "CreateUser")
    defer span.End()
    
    if err := validate(user); err != nil {
        // Record the error as an event
        span.RecordError(err)
        
        // Set span status to Error
        span.SetStatus(codes.Error, err.Error())
        
        return err
    }
    
    if err := db.Save(user); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to save user")
        return err
    }
    
    // Success - status is OK by default
    return nil
}
```

### RecordError Details

`RecordError` adds an event with:
- `exception.type`: The error type
- `exception.message`: The error message
- `exception.stacktrace`: Stack trace (if available)

```go
// RecordError creates an event like:
{
    "name": "exception",
    "timestamp": "2024-01-15T10:30:45.123Z",
    "attributes": {
        "exception.type": "*errors.errorString",
        "exception.message": "user not found"
    }
}
```

## Getting the Current Span

Sometimes you need to access the current span without creating a new one:

```go
import "go.opentelemetry.io/otel/trace"

func SomeHelper(ctx context.Context) {
    // Get the span from context (doesn't create a new one)
    span := trace.SpanFromContext(ctx)
    
    // Add attributes to the existing span
    span.SetAttributes(
        attribute.String("helper.called", "true"),
    )
}
```

This is useful in:
- Helper functions that don't warrant their own span
- Middleware that needs to add attributes
- Error handlers

## From Our Codebase

Here's how we use tracing in the User API handlers:

```go
// handlers/user.go

func (h *UserHandler) GetAll(c *gin.Context) {
    ctx := c.Request.Context()
    
    // Get the span created by otelgin middleware
    span := trace.SpanFromContext(ctx)

    h.logger.InfoContext(ctx, "Fetching all users")

    users, err := h.store.GetAll()
    if err != nil {
        // Record error on the span
        span.RecordError(err)
        h.logger.ErrorContext(ctx, "Failed to fetch users", "error", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
        return
    }

    // Add result count as attribute
    span.SetAttributes(attribute.Int("user_count", len(users)))
    
    h.logger.InfoContext(ctx, "Successfully fetched users", "count", len(users))
    c.JSON(http.StatusOK, users)
}

func (h *UserHandler) Create(c *gin.Context) {
    ctx := c.Request.Context()
    span := trace.SpanFromContext(ctx)

    var req models.CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        h.logger.WarnContext(ctx, "Invalid request body", "error", err)
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Add user details as span attributes
    span.SetAttributes(
        attribute.String("user.id", user.ID),
        attribute.String("user.email", user.Email),
    )

    if err := h.store.Create(user); err != nil {
        span.RecordError(err)
        // ... error handling
    }
    
    // ... success path
}
```

## Creating Child Spans

Child spans show nested operations:

```go
func ProcessOrder(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "ProcessOrder")
    defer span.End()
    
    // Child span 1: Validate
    if err := validateOrder(ctx, order); err != nil {
        return err
    }
    
    // Child span 2: Check inventory
    if err := checkInventory(ctx, order); err != nil {
        return err
    }
    
    // Child span 3: Process payment
    if err := processPayment(ctx, order); err != nil {
        return err
    }
    
    return nil
}

func validateOrder(ctx context.Context, order Order) error {
    // This creates a child span of ProcessOrder
    ctx, span := tracer.Start(ctx, "ValidateOrder")
    defer span.End()
    
    // Validation logic...
    return nil
}

func checkInventory(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "CheckInventory")
    defer span.End()
    
    // Inventory check logic...
    return nil
}

func processPayment(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "ProcessPayment")
    defer span.End()
    
    // Payment logic...
    return nil
}
```

This creates a trace like:

```
ProcessOrder (total: 250ms)
├── ValidateOrder (20ms)
├── CheckInventory (80ms)
└── ProcessPayment (150ms)
```

## Span Options

### Setting Span Kind

```go
import "go.opentelemetry.io/otel/trace"

// Server span (handling incoming request)
ctx, span := tracer.Start(ctx, "HandleRequest",
    trace.WithSpanKind(trace.SpanKindServer),
)

// Client span (making outgoing request)
ctx, span := tracer.Start(ctx, "CallExternalAPI",
    trace.WithSpanKind(trace.SpanKindClient),
)

// Internal span (within service)
ctx, span := tracer.Start(ctx, "ProcessData",
    trace.WithSpanKind(trace.SpanKindInternal),
)

// Producer span (sending to queue)
ctx, span := tracer.Start(ctx, "PublishMessage",
    trace.WithSpanKind(trace.SpanKindProducer),
)

// Consumer span (processing from queue)
ctx, span := tracer.Start(ctx, "ConsumeMessage",
    trace.WithSpanKind(trace.SpanKindConsumer),
)
```

### Adding Initial Attributes

```go
ctx, span := tracer.Start(ctx, "ProcessOrder",
    trace.WithAttributes(
        attribute.String("order.id", orderID),
        attribute.Int("order.items", len(items)),
    ),
)
```

### Linking Spans

Link to related spans (e.g., batch processing):

```go
// Link to multiple related traces
ctx, span := tracer.Start(ctx, "BatchProcess",
    trace.WithLinks(
        trace.Link{SpanContext: span1.SpanContext()},
        trace.Link{SpanContext: span2.SpanContext()},
    ),
)
```

## Pattern: Wrap External Calls

Always wrap external service calls:

```go
func (c *Client) GetUser(ctx context.Context, userID string) (*User, error) {
    ctx, span := tracer.Start(ctx, "external.user-service.GetUser",
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.String("user.id", userID),
            attribute.String("rpc.service", "user-service"),
            attribute.String("rpc.method", "GetUser"),
        ),
    )
    defer span.End()
    
    user, err := c.doRequest(ctx, "/users/"+userID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }
    
    return user, nil
}
```

## Pattern: Database Operations

```go
func (r *Repository) FindUser(ctx context.Context, id string) (*User, error) {
    ctx, span := tracer.Start(ctx, "db.users.FindUser",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.name", "myapp"),
            attribute.String("db.operation", "SELECT"),
            attribute.String("db.sql.table", "users"),
        ),
    )
    defer span.End()
    
    query := "SELECT * FROM users WHERE id = $1"
    span.SetAttributes(attribute.String("db.statement", query))
    
    var user User
    err := r.db.QueryRowContext(ctx, query, id).Scan(&user)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }
    
    return &user, nil
}
```

## Summary Checklist

When instrumenting a function:

1. ✅ Create span with descriptive name
2. ✅ Always `defer span.End()`
3. ✅ Add relevant attributes
4. ✅ Record errors with `RecordError`
5. ✅ Set status on error with `SetStatus`
6. ✅ Pass context to child functions
7. ✅ Use semantic conventions where applicable

```go
func ExampleFunction(ctx context.Context, input Input) (Output, error) {
    ctx, span := tracer.Start(ctx, "ExampleFunction")  // 1, 2
    defer span.End()
    
    span.SetAttributes(attribute.String("input.id", input.ID))  // 3
    
    result, err := doSomething(ctx, input)  // 6
    if err != nil {
        span.RecordError(err)  // 4
        span.SetStatus(codes.Error, err.Error())  // 5
        return Output{}, err
    }
    
    return result, nil
}
```

---

**Previous:** [← Configuring Logs](08-configuring-logs.md)

**Next:** [Using Metrics in Code →](10-using-metrics.md)
