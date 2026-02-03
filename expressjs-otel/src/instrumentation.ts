// This file MUST be imported first, before any other modules
// It sets up OpenTelemetry instrumentation which needs to patch modules before they're loaded

import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { propagation, metrics } from "@opentelemetry/api";
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from "@opentelemetry/core";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { trace } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { logs } from "@opentelemetry/api-logs";

const serviceName = process.env.OTEL_SERVICE_NAME || "user-api-express";
const serviceVersion = "1.0.0";
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "localhost:4317";

console.log(`[Instrumentation] Initializing OpenTelemetry for ${serviceName}`);
console.log(`[Instrumentation] OTLP Endpoint: ${otlpEndpoint}`);

// Create resource
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion
});

// Set up propagation
propagation.setGlobalPropagator(
  new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()]
  })
);

// Initialize Tracer Provider with HTTP exporter
const traceExporter = new OTLPTraceExporter({
  url: `http://${otlpEndpoint.replace(':4317', ':4318')}/v1/traces`
});

const tracerProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(traceExporter)]
});

tracerProvider.register({
  contextManager: new AsyncLocalStorageContextManager()
});

trace.setGlobalTracerProvider(tracerProvider);

// Register instrumentations BEFORE any other imports
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
});

console.log('[Instrumentation] Trace provider initialized and instrumentations registered');

// Initialize Metrics Provider
const metricExporter = new OTLPMetricExporter({
  url: `http://${otlpEndpoint.replace(':4317', ':4318')}/v1/metrics`
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10000
});

const meterProvider = new MeterProvider({
  resource,
  readers: [metricReader]
});

metrics.setGlobalMeterProvider(meterProvider);
console.log('[Instrumentation] Metrics provider initialized');

// Initialize Logger Provider
const logExporter = new OTLPLogExporter({
  url: `http://${otlpEndpoint.replace(':4317', ':4318')}/v1/logs`
});

const loggerProvider = new LoggerProvider({
  resource,
  processors: [new BatchLogRecordProcessor(logExporter)]
});

logs.setGlobalLoggerProvider(loggerProvider);
console.log('[Instrumentation] Logger provider initialized');

// Export shutdown function
export const shutdown = async (): Promise<void> => {
  await loggerProvider.shutdown();
  await meterProvider.shutdown();
  await tracerProvider.shutdown();
  console.log('[Instrumentation] All providers shut down');
};
