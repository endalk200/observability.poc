import fs from "node:fs/promises";
import path from "node:path";
import { trace, context, SpanStatusCode } from "@opentelemetry/api";
import { User } from "../models/user";

export class UserNotFoundError extends Error {
  constructor() {
    super("user not found");
  }
}

export class UserExistsError extends Error {
  constructor() {
    super("user with this email already exists");
  }
}

type StoreState = {
  filePath: string;
  users: Map<string, User>;
  writeQueue: Promise<void>;
};

export class JsonStore {
  private state: StoreState;
  private tracer = trace.getTracer("user-api-express");

  constructor(filePath: string) {
    this.state = {
      filePath,
      users: new Map(),
      writeQueue: Promise.resolve()
    };
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.state.filePath), { recursive: true });
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.state.filePath, "utf8");
      if (!data) {
        return;
      }
      const users = JSON.parse(data) as User[];
      this.state.users = new Map(users.map((user) => [user.id, user]));
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }

  private async persist(): Promise<void> {
    const span = this.tracer.startSpan("db.persist", {
      attributes: {
        "db.operation": "write",
        "db.file": this.state.filePath,
        "db.record_count": this.state.users.size
      }
    });

    try {
      const users = Array.from(this.state.users.values());
      const data = JSON.stringify(users, null, 2);
      
      span.setAttribute("db.data_size_bytes", Buffer.byteLength(data, "utf8"));
      
      await fs.writeFile(this.state.filePath, data, "utf8");
      
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  private enqueueWrite(action: () => Promise<void>): Promise<void> {
    this.state.writeQueue = this.state.writeQueue.then(action);
    return this.state.writeQueue;
  }

  getAll(): User[] {
    return Array.from(this.state.users.values());
  }

  getById(id: string): User {
    const user = this.state.users.get(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }

  async create(user: User): Promise<void> {
    const span = this.tracer.startSpan("db.create", {
      attributes: {
        "db.operation": "create",
        "db.collection": "users",
        "user.id": user.id,
        "user.email": user.email
      }
    });

    try {
      // Check for duplicate email
      const checkSpan = this.tracer.startSpan("db.check_duplicate_email", {
        attributes: {
          "db.operation": "read",
          "user.email": user.email
        }
      });
      
      for (const existing of this.state.users.values()) {
        if (existing.email === user.email) {
          checkSpan.setAttribute("duplicate_found", true);
          checkSpan.end();
          span.setStatus({ 
            code: SpanStatusCode.ERROR, 
            message: "Duplicate email" 
          });
          span.end();
          throw new UserExistsError();
        }
      }
      
      checkSpan.setAttribute("duplicate_found", false);
      checkSpan.end();

      // Add to store
      this.state.users.set(user.id, user);
      span.setAttribute("db.users_total", this.state.users.size);
      
      // Persist to disk
      await this.enqueueWrite(() => this.persist());
      
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      if (!(error instanceof UserExistsError)) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      throw error;
    } finally {
      span.end();
    }
  }

  async update(user: User): Promise<void> {
    if (!this.state.users.has(user.id)) {
      throw new UserNotFoundError();
    }
    for (const [id, existing] of this.state.users.entries()) {
      if (existing.email === user.email && id !== user.id) {
        throw new UserExistsError();
      }
    }
    this.state.users.set(user.id, user);
    await this.enqueueWrite(() => this.persist());
  }

  async delete(id: string): Promise<void> {
    if (!this.state.users.has(id)) {
      throw new UserNotFoundError();
    }
    this.state.users.delete(id);
    await this.enqueueWrite(() => this.persist());
  }
}
