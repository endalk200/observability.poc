import * as Sentry from "@sentry/nextjs";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error, input }) => {
      // Always capture errors in Sentry with full context
      Sentry.captureException(error, {
        extra: {
          path,
          input,
        },
        tags: {
          trpc_path: path ?? "unknown",
          error_code: error.code,
        },
      });

      // Log error to Sentry logs
      Sentry.logger.error(`tRPC error on ${path ?? "<no-path>"}`, {
        path: path ?? "unknown",
        error_message: error.message,
        error_code: error.code,
        input: JSON.stringify(input),
      });

      // Console log in development
      if (env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
        );
      }
    },
  });

export { handler as GET, handler as POST };
