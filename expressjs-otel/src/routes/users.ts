import { Router } from "express";
import { createUserHandlers } from "../handlers/users";
import { JsonStore } from "../storage/jsonStore";
import { UserMetrics } from "../telemetry/metrics";

type RouteDeps = {
  store: JsonStore;
  metrics: UserMetrics;
};

const buildRouter = ({ store, metrics }: RouteDeps): Router => {
  const router = Router();
  const handlers = createUserHandlers({ store, metrics });

  router.get("/users", handlers.getAll);
  router.get("/users/:id", handlers.getById);
  router.post("/users", handlers.create);
  router.put("/users/:id", handlers.update);
  router.delete("/users/:id", handlers.remove);

  return router;
};

export default buildRouter;
