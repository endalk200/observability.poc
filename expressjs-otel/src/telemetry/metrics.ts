import { Meter, metrics } from "@opentelemetry/api";
import { Counter, UpDownCounter } from "@opentelemetry/api";

export type UserMetrics = {
  userCounter: UpDownCounter;
  usersCreated: Counter;
  usersDeleted: Counter;
  userOperations: Counter;
};

export const createUserMetrics = (meter: Meter): UserMetrics => {
  const userCounter = meter.createUpDownCounter("user_api_users_total", {
    description: "Current number of users in the system",
    unit: "{users}"
  });

  const usersCreated = meter.createCounter("user_api_users_created_total", {
    description: "Total number of users created",
    unit: "{users}"
  });

  const usersDeleted = meter.createCounter("user_api_users_deleted_total", {
    description: "Total number of users deleted",
    unit: "{users}"
  });

  const userOperations = meter.createCounter("user_api_operations_total", {
    description: "Total number of user operations",
    unit: "{operations}"
  });

  return { userCounter, usersCreated, usersDeleted, userOperations };
};

export const getMeter = (serviceName: string): Meter => {
  return metrics.getMeter(serviceName);
};
