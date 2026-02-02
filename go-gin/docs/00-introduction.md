# Introduction to Observability

Welcome to this comprehensive guide on observability with OpenTelemetry in Go. This tutorial will take you from zero knowledge to confidently implementing logs, traces, and metrics in your Go applications.

## What is Observability?

Observability is the ability to understand the internal state of a system by examining its external outputs. In software systems, this means being able to answer questions like:

- Why is this request slow?
- Why did this error occur?
- What was happening in my system when this user reported a problem?
- How is my application performing right now?

Observability differs from traditional monitoring. While monitoring tells you _if_ something is wrong, observability helps you understand _why_ something is wrong.

## The Three Pillars of Observability

Observability is built on three fundamental types of telemetry data, often called the "three pillars":

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY                                 │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│        LOGS         │       TRACES        │        METRICS          │
├─────────────────────┼─────────────────────┼─────────────────────────┤
│ "What happened"     │ "How it happened"   │ "How much/how many"     │
│                     │                     │                         │
│ • Discrete events   │ • Request flow      │ • Aggregated data       │
│ • Debug info        │ • Latency breakdown │ • Counters              │
│ • Error messages    │ • Service calls     │ • Gauges                │
│ • Audit trail       │ • Dependencies      │ • Histograms            │
└─────────────────────┴─────────────────────┴─────────────────────────┘
```

### 1. Logs

Logs are timestamped records of discrete events that happened in your system. They tell you **what happened**.

Example: "User john@example.com logged in at 2024-01-15 10:30:45"

### 2. Traces

Traces track the journey of a request as it flows through your system. They tell you **how it happened** and **where time was spent**.

Example: A trace showing an HTTP request that hit your API, queried a database, and called an external service.

### 3. Metrics

Metrics are numerical measurements collected over time. They tell you **how much** or **how many**.

Example: "Request count: 1,523 in the last minute" or "CPU usage: 45%"

## Why Do You Need All Three?

Each pillar provides a different perspective on your system:

| Scenario                                   | Logs | Traces | Metrics |
| ------------------------------------------ | ---- | ------ | ------- |
| "Is my system healthy?"                    | ❌   | ❌     | ✅      |
| "Why did this specific request fail?"      | ✅   | ✅     | ❌      |
| "Where is the bottleneck in this request?" | ❌   | ✅     | ❌      |
| "What exactly happened during the error?"  | ✅   | ❌     | ❌      |
| "Is error rate increasing?"                | ❌   | ❌     | ✅      |
| "Which service caused the failure?"        | ❌   | ✅     | ❌      |

When combined, they give you complete visibility:

```
                    Request comes in
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  METRICS: Request count increased by 1                          │
│  TRACE: Started trace abc123 for GET /users/42                  │
│  LOG: "Received request for user 42"                            │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  TRACE: Span "database.query" started (child of abc123)         │
│  LOG: "Querying database for user 42"                           │
│  METRICS: Database query started                                │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  TRACE: Span "database.query" completed (45ms)                  │
│  LOG: "User 42 found: John Doe"                                 │
│  METRICS: Database query duration: 45ms                         │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  TRACE: Trace abc123 completed (52ms total)                     │
│  LOG: "Request completed successfully"                          │
│  METRICS: Request duration: 52ms, Success count +1              │
└──────────────────────────────────────────────────────────────────┘
```

## What You'll Learn

This tutorial is organized into the following sections:

### Part 1: Concepts (Understanding the Fundamentals)

1. **[Logs](01-concepts-logs.md)** - Understanding structured logging
2. **[Traces and Spans](02-concepts-traces.md)** - Understanding distributed tracing
3. **[Metrics](03-concepts-metrics.md)** - Understanding metric types and use cases

### Part 2: OpenTelemetry

4. **[OpenTelemetry Architecture](04-opentelemetry-architecture.md)** - Understanding OTel components

### Part 3: Configuration in Go

5. **[Setting Up OpenTelemetry](05-setup-go.md)** - Project setup and dependencies
6. **[Configuring Traces](06-configuring-traces.md)** - Setting up trace providers
7. **[Configuring Metrics](07-configuring-metrics.md)** - Setting up meter providers
8. **[Configuring Logs](08-configuring-logs.md)** - Setting up logger providers

### Part 4: Using Telemetry in Go Code

9. **[Using Traces](09-using-traces.md)** - Creating spans and adding attributes
10. **[Using Metrics](10-using-metrics.md)** - Recording counters, gauges, and histograms
11. **[Using Logs](11-using-logs.md)** - Structured logging with context

### Part 5: Exporting Data

12. **[Exporting Telemetry](12-exporting-telemetry.md)** - Sending data to backends

## Prerequisites

To follow this tutorial, you should have:

- Basic knowledge of Go programming
- Go 1.21 or later installed
- Docker (optional, for running the observability stack)

## Reference Codebase

This tutorial uses a real-world example: a User API service built with Go and the Gin framework. The complete code is available in this repository.

The architecture looks like this:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Go Application                          │
│                         (User API Service)                          │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Traces    │  │   Metrics   │  │    Logs     │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          │                                          │
│                    OTLP Protocol                                    │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    OpenTelemetry Collector                           │
│                      (Grafana Alloy)                                 │
│                                                                      │
│    Receives → Processes → Exports                                    │
└──────────────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │ Prometheus │   │   Tempo    │   │    Loki    │
   │  (Metrics) │   │  (Traces)  │   │   (Logs)   │
   └────────────┘   └────────────┘   └────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                    ┌────────────┐
                    │  Grafana   │
                    │  (UI)      │
                    └────────────┘
```

Let's begin with understanding [Logs](01-concepts-logs.md).

---

**Next:** [Understanding Logs →](01-concepts-logs.md)
