import { Request, Response, NextFunction } from "express";
import { logs } from "@opentelemetry/api-logs";
import { context, trace } from "@opentelemetry/api";

const logger = logs.getLogger("user-api-express");

export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = process.hrtime.bigint();

  logger.emit({
    severityText: "INFO",
    body: "Incoming request",
    attributes: {
      method: req.method,
      path: req.path,
      client_ip: req.ip
    }
  });

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const span = trace.getSpan(context.active());
    const spanContext = span?.spanContext();

    logger.emit({
      severityText: "INFO",
      body: "Request completed",
      attributes: {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Math.round(durationMs),
        trace_id: spanContext?.traceId,
        span_id: spanContext?.spanId
      }
    });
  });

  next();
};
