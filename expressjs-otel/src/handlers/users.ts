import { Request, Response } from "express";
import { context, trace, SpanStatusCode } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { v4 as uuidv4 } from "uuid";
import { createUserSchema, updateUserSchema, User } from "../models/user";
import {
  JsonStore,
  UserExistsError,
  UserNotFoundError,
} from "../storage/jsonStore";
import { UserMetrics } from "../telemetry/metrics";

const logger = logs.getLogger("user-api-express");

type HandlerDeps = {
  store: JsonStore;
  metrics: UserMetrics;
};

const recordError = (error: unknown, message: string): void => {
  const span = trace.getSpan(context.active());
  if (span) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
  logger.emit({
    severityText: "ERROR",
    body: message,
    attributes: {
      error: error instanceof Error ? error.message : String(error),
    },
  });
};

export const createUserHandlers = ({ store, metrics }: HandlerDeps) => {
  const getAll = (_req: Request, res: Response): void => {
    const span = trace.getSpan(context.active());
    logger.emit({ severityText: "INFO", body: "Fetching all users" });
    metrics.userOperations.add(1, { operation: "get_all" });

    const users = store.getAll();
    span?.setAttribute("user_count", users.length);
    res.status(200).json(users);
  };

  const getById = (req: Request, res: Response): void => {
    const span = trace.getSpan(context.active());
    const id = String(req.params.id);
    span?.setAttribute("user.id", id);
    logger.emit({
      severityText: "INFO",
      body: "Fetching user by ID",
      attributes: { user_id: id },
    });
    metrics.userOperations.add(1, { operation: "get_by_id" });

    try {
      const user = store.getById(id);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        logger.emit({
          severityText: "WARN",
          body: "User not found",
          attributes: { user_id: id },
        });
        res.status(404).json({ error: "User not found" });
        return;
      }
      recordError(error, "Failed to fetch user");
      res.status(500).json({ error: "Failed to fetch user" });
    }
  };

  const create = async (req: Request, res: Response): Promise<void> => {
    metrics.userOperations.add(1, { operation: "create" });
    
    // Get the tracer for creating child spans
    const tracer = trace.getTracer("user-api-express");
    const parentSpan = trace.getSpan(context.active());

    // CHILD SPAN #1: Validate request body
    // This creates a child span within the current context
    const validationSpan = tracer.startSpan("user.validate_request", {
      attributes: {
        "validation.type": "create_user",
        "request.body.present": !!req.body
      }
    });

    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      // Record validation failure in the span
      validationSpan.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: "Validation failed" 
      });
      validationSpan.setAttribute("validation.error", parseResult.error.message);
      validationSpan.end(); // Always end spans!
      
      logger.emit({ severityText: "WARN", body: "Invalid request body" });
      res.status(400).json({ error: parseResult.error.message });
      return;
    }
    
    validationSpan.setAttribute("validation.success", true);
    validationSpan.end();

    // CHILD SPAN #2: Build user object
    const buildUserSpan = tracer.startSpan("user.build_object");
    
    const { name, email } = parseResult.data;
    const now = new Date().toISOString();
    const user: User = {
      id: uuidv4(),
      name,
      email,
      created_at: now,
      updated_at: now,
    };
    
    // Add context to the build span
    buildUserSpan.setAttributes({
      "user.id": user.id,
      "user.email": user.email,
      "user.name": user.name,
      "user.created_at": user.created_at
    });
    buildUserSpan.end();

    // Add attributes to parent span too
    parentSpan?.setAttributes({ 
      "user.id": user.id, 
      "user.email": user.email 
    });

    // CHILD SPAN #3: Database operation
    // Use context.with() to ensure proper parent-child relationship
    await context.with(trace.setSpan(context.active(), parentSpan!), async () => {
      const dbSpan = tracer.startSpan("user.db.create", {
        attributes: {
          "db.operation": "create",
          "db.collection": "users",
          "user.id": user.id
        }
      });

      try {
        await store.create(user);
        
        // Record success
        dbSpan.setStatus({ code: SpanStatusCode.OK });
        dbSpan.setAttribute("db.success", true);
        dbSpan.end();
        
        // Update metrics
        metrics.usersCreated.add(1);
        metrics.userCounter.add(1);
        
        res.status(201).json(user);
      } catch (error) {
        // Record error in the db span
        dbSpan.recordException(error as Error);
        dbSpan.setStatus({ code: SpanStatusCode.ERROR });
        dbSpan.end();
        
        if (error instanceof UserExistsError) {
          logger.emit({
            severityText: "WARN",
            body: "User with email already exists",
            attributes: { email },
          });
          res.status(409).json({ error: "User with this email already exists" });
          return;
        }
        recordError(error, "Failed to create user");
        res.status(500).json({ error: "Failed to create user" });
      }
    });
  };

  const update = async (req: Request, res: Response): Promise<void> => {
    const span = trace.getSpan(context.active());
    const id = String(req.params.id);
    span?.setAttribute("user.id", id);
    metrics.userOperations.add(1, { operation: "update" });

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.emit({ severityText: "WARN", body: "Invalid request body" });
      res.status(400).json({ error: parseResult.error.message });
      return;
    }

    try {
      const existingUser = store.getById(id);
      const now = new Date().toISOString();
      const user: User = {
        id,
        name: parseResult.data.name,
        email: parseResult.data.email,
        created_at: existingUser.created_at,
        updated_at: now,
      };

      await store.update(user);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        logger.emit({
          severityText: "WARN",
          body: "User not found",
          attributes: { user_id: id },
        });
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (error instanceof UserExistsError) {
        logger.emit({
          severityText: "WARN",
          body: "Email already in use",
          attributes: { email: parseResult.data.email },
        });
        res.status(409).json({ error: "Email already in use by another user" });
        return;
      }
      recordError(error, "Failed to update user");
      res.status(500).json({ error: "Failed to update user" });
    }
  };

  const remove = async (req: Request, res: Response): Promise<void> => {
    const span = trace.getSpan(context.active());
    const id = String(req.params.id);
    span?.setAttribute("user.id", id);
    metrics.userOperations.add(1, { operation: "delete" });

    const tracer = trace.getTracer("user-api-express");
    const existsSpan = tracer.startSpan("user.exists");
    existsSpan.setAttribute("user.id", id);

    try {
      store.getById(id);
      existsSpan.setAttribute("user.exists", true);
    } catch (error) {
      existsSpan.setAttribute("user.exists", false);
      existsSpan.end();
      if (error instanceof UserNotFoundError) {
        logger.emit({
          severityText: "WARN",
          body: "User not found",
          attributes: { user_id: id },
        });
        res.status(404).json({ error: "User not found" });
        return;
      }
      recordError(error, "Failed to check user existence");
      res.status(500).json({ error: "Failed to delete user" });
      return;
    }
    existsSpan.end();

    try {
      await store.delete(id);
      metrics.usersDeleted.add(1);
      metrics.userCounter.add(-1);
      res.status(204).send();
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        logger.emit({
          severityText: "WARN",
          body: "User not found",
          attributes: { user_id: id },
        });
        res.status(404).json({ error: "User not found" });
        return;
      }
      recordError(error, "Failed to delete user");
      res.status(500).json({ error: "Failed to delete user" });
    }
  };

  return { getAll, getById, create, update, remove };
};
