import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

// GET /api/posts/check-name - Check if a name is available
export async function GET(request: Request) {
	return Sentry.startSpan(
		{
			name: "GET /api/posts/check-name",
			op: "http.server",
			attributes: {
				"http.method": "GET",
				"http.route": "/api/posts/check-name",
			},
		},
		async () => {
			const startTime = Date.now();

			try {
				const { searchParams } = new URL(request.url);
				const name = searchParams.get("name");
				const excludeId = searchParams.get("excludeId");

				if (!name) {
					Sentry.logger.warn("Name parameter missing for availability check");
					return NextResponse.json(
						{ error: "Name parameter is required" },
						{ status: 400 },
					);
				}

				Sentry.logger.info("Checking name availability", {
					name,
					exclude_id: excludeId ?? null,
				});

				const existingPost = await Sentry.startSpan(
					{ name: "db.post.findUnique", op: "db.query" },
					async () => {
						return db.post.findUnique({
							where: { name },
						});
					},
				);

				const duration = Date.now() - startTime;

				if (!existingPost) {
					Sentry.logger.info("Name is available", {
						name,
						available: true,
						duration_ms: duration,
					});
					return NextResponse.json({ data: { available: true } });
				}

				// If we're excluding an ID (for update scenarios), check if it's the same post
				if (excludeId) {
					const excludeIdNum = parseInt(excludeId, 10);
					if (!Number.isNaN(excludeIdNum) && existingPost.id === excludeIdNum) {
						Sentry.logger.info("Name is available (same post)", {
							name,
							available: true,
							exclude_id: excludeIdNum,
							duration_ms: duration,
						});
						return NextResponse.json({ data: { available: true } });
					}
				}

				Sentry.logger.info("Name is not available", {
					name,
					available: false,
					existing_post_id: existingPost.id,
					duration_ms: duration,
				});
				return NextResponse.json({ data: { available: false } });
			} catch (error) {
				Sentry.captureException(error, {
					tags: { api_route: "/api/posts/check-name", method: "GET" },
				});
				Sentry.logger.error("Failed to check name availability", {
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return NextResponse.json(
					{ error: "Failed to check name availability" },
					{ status: 500 },
				);
			}
		},
	);
}
