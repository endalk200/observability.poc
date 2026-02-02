import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

// GET /api/posts/count - Get total count of posts
export async function GET(request: Request) {
	return Sentry.startSpan(
		{
			name: "GET /api/posts/count",
			op: "http.server",
			attributes: {
				"http.method": "GET",
				"http.route": "/api/posts/count",
			},
		},
		async () => {
			const startTime = Date.now();

			try {
				const { searchParams } = new URL(request.url);
				const search = searchParams.get("search");

				Sentry.logger.info("Counting posts", {
					has_search: !!search,
					search: search ?? null,
				});

				const where = search
					? {
							OR: [
								{ name: { contains: search } },
								{ description: { contains: search } },
								{ content: { contains: search } },
							],
						}
					: {};

				const count = await Sentry.startSpan(
					{ name: "db.post.count", op: "db.query" },
					async () => {
						return db.post.count({ where });
					},
				);

				const duration = Date.now() - startTime;
				Sentry.logger.info("Posts counted successfully", {
					count,
					has_search: !!search,
					duration_ms: duration,
				});

				return NextResponse.json({ data: { count } });
			} catch (error) {
				Sentry.captureException(error, {
					tags: { api_route: "/api/posts/count", method: "GET" },
				});
				Sentry.logger.error("Failed to count posts", {
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return NextResponse.json(
					{ error: "Failed to count posts" },
					{ status: 500 },
				);
			}
		},
	);
}
