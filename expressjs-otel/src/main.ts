// IMPORTANT: instrumentation MUST be imported first
import { shutdown as telemetryShutdown } from "./instrumentation";
import express from "express";
import { getEnv } from "./utils/env";
import { JsonStore } from "./storage/jsonStore";
import healthRouter from "./routes/health";
import usersRouter from "./routes/users";
import { loggingMiddleware } from "./middleware/logging";
import { createUserMetrics, getMeter } from "./telemetry/metrics";

const serviceName = "user-api-express";

const main = async (): Promise<void> => {

  const dataPath = getEnv("DATA_PATH", "./data/users.json");
  const store = new JsonStore(dataPath);
  await store.init();

  const meter = getMeter(serviceName);
  const metrics = createUserMetrics(meter);
  metrics.userCounter.add(store.getAll().length);

  const app = express();
  app.use(express.json());
  app.use(loggingMiddleware);
  app.use(healthRouter);
  app.use(usersRouter({ store, metrics }));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  const port = Number(getEnv("PORT", "8080"));
  const server = app.listen(port);

  const shutdown = async () => {
    console.log('Shutting down server...');
    server.close();
    await telemetryShutdown();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
