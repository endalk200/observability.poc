import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

// Schema for creating a post
const createPostSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be less than 100 characters"),
	description: z
		.string()
		.max(500, "Description must be less than 500 characters")
		.optional(),
	content: z.string().min(1, "Content is required"),
});

// Schema for list query params
const listQuerySchema = z.object({
	search: z.string().optional(),
	orderBy: z
		.enum(["createdAt", "updatedAt", "name"])
		.optional()
		.default("createdAt"),
	orderDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

// GET /api/posts - List all posts
export async function GET(request: Request) {
	return Sentry.startSpan(
		{
			name: "GET /api/posts",
			op: "http.server",
			attributes: {
				"http.method": "GET",
				"http.route": "/api/posts",
			},
		},
		async () => {
			const startTime = Date.now();

			try {
				const { searchParams } = new URL(request.url);
				const query = listQuerySchema.parse({
					search: searchParams.get("search") ?? undefined,
					orderBy: searchParams.get("orderBy") ?? undefined,
					orderDir: searchParams.get("orderDir") ?? undefined,
				});

				Sentry.logger.info("Fetching posts list", {
					search: query.search ?? null,
					order_by: query.orderBy,
					order_dir: query.orderDir,
				});

				const where = query.search
					? {
							OR: [
								{ name: { contains: query.search } },
								{ description: { contains: query.search } },
								{ content: { contains: query.search } },
							],
						}
					: {};

				const posts = await Sentry.startSpan(
					{ name: "db.post.findMany", op: "db.query" },
					async () => {
						return db.post.findMany({
							where,
							orderBy: { [query.orderBy]: query.orderDir },
						});
					},
				);

				const duration = Date.now() - startTime;
				Sentry.logger.info("Posts list fetched successfully", {
					count: posts.length,
					duration_ms: duration,
					has_search: !!query.search,
				});

				return NextResponse.json({ data: posts });
			} catch (error) {
				if (error instanceof z.ZodError) {
					Sentry.logger.warn("Invalid query parameters for posts list", {
						errors: JSON.stringify(error.errors),
					});
					return NextResponse.json(
						{ error: "Invalid query parameters", details: error.errors },
						{ status: 400 },
					);
				}

				Sentry.captureException(error, {
					tags: { api_route: "/api/posts", method: "GET" },
				});
				Sentry.logger.error("Failed to fetch posts", {
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return NextResponse.json(
					{ error: "Failed to fetch posts" },
					{ status: 500 },
				);
			}
		},
	);
}

// POST /api/posts - Create a new post
export async function POST(request: Request) {
	return Sentry.startSpan(
		{
			name: "POST /api/posts",
			op: "http.server",
			attributes: {
				"http.method": "POST",
				"http.route": "/api/posts",
			},
		},
		async () => {
			const startTime = Date.now();

			try {
				const body = await request.json();
				const data = createPostSchema.parse(body);

				Sentry.logger.info("Creating new post", {
					post_name: data.name,
					has_description: !!data.description,
					content_length: data.content.length,
				});

				// Check if post with this name already exists
				const existingPost = await Sentry.startSpan(
					{ name: "db.post.findUnique", op: "db.query" },
					async () => {
						return db.post.findUnique({
							where: { name: data.name },
						});
					},
				);

				if (existingPost) {
					Sentry.logger.warn("Post creation failed - duplicate name", {
						post_name: data.name,
						existing_post_id: existingPost.id,
					});
					return NextResponse.json(
						{ error: "A post with this name already exists" },
						{ status: 409 },
					);
				}

				const post = await Sentry.startSpan(
					{ name: "db.post.create", op: "db.query" },
					async () => {
						return db.post.create({
							data: {
								name: data.name,
								description: data.description,
								content: data.content,
							},
						});
					},
				);

				const duration = Date.now() - startTime;
				Sentry.logger.info("Post created successfully", {
					post_id: post.id,
					post_name: post.name,
					duration_ms: duration,
				});

				return NextResponse.json({ data: post }, { status: 201 });
			} catch (error) {
				if (error instanceof z.ZodError) {
					Sentry.logger.warn("Post validation failed", {
						errors: JSON.stringify(error.errors),
					});
					return NextResponse.json(
						{ error: "Validation failed", details: error.errors },
						{ status: 400 },
					);
				}

				Sentry.captureException(error, {
					tags: { api_route: "/api/posts", method: "POST" },
				});
				Sentry.logger.error("Failed to create post", {
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return NextResponse.json(
					{ error: "Failed to create post" },
					{ status: 500 },
				);
			}
		},
	);
}
