import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

// Schema for updating a post
const updatePostSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be less than 100 characters")
		.optional(),
	description: z
		.string()
		.max(500, "Description must be less than 500 characters")
		.nullable()
		.optional(),
	content: z.string().min(1, "Content is required").optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/posts/[id] - Get a single post
export async function GET(_request: Request, { params }: RouteParams) {
	const { id } = await params;

	return Sentry.startSpan(
		{
			name: "GET /api/posts/[id]",
			op: "http.server",
			attributes: {
				"http.method": "GET",
				"http.route": "/api/posts/[id]",
				"post.id": id,
			},
		},
		async () => {
			const startTime = Date.now();

			try {
				const postId = parseInt(id, 10);

				if (Number.isNaN(postId)) {
					Sentry.logger.warn("Invalid post ID provided", { id });
					return NextResponse.json(
						{ error: "Invalid post ID" },
						{ status: 400 },
					);
				}

				Sentry.logger.info("Fetching post by ID", { post_id: postId });

				const post = await Sentry.startSpan(
					{ name: "db.post.findUnique", op: "db.query" },
					async () => {
						return db.post.findUnique({
							where: { id: postId },
						});
					},
				);

				if (!post) {
					Sentry.logger.warn("Post not found", { post_id: postId });
					return NextResponse.json(
						{ error: "Post not found" },
						{ status: 404 },
					);
				}

				const duration = Date.now() - startTime;
				Sentry.logger.info("Post fetched successfully", {
					post_id: post.id,
					post_name: post.name,
					duration_ms: duration,
				});

				return NextResponse.json({ data: post });
			} catch (error) {
				Sentry.captureException(error, {
					tags: { api_route: "/api/posts/[id]", method: "GET" },
					extra: { post_id: id },
				});
				Sentry.logger.error("Failed to fetch post", {
					post_id: id,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return NextResponse.json(
					{ error: "Failed to fetch post" },
					{ status: 500 },
				);
			}
		},
	);
}

// PUT /api/posts/[id] - Update a post
export async function PUT(request: Request, { params }: RouteParams) {
	const { id } = await params;

	return Sentry.startSpan(
		{
			name: "PUT /api/posts/[id]",
			op: "http.server",
			attributes: {
				"http.method": "PUT",
				"http.route": "/api/posts/[id]",
				"post.id": id,
			},
		},
		async () => {
			const startTime = Date.now();

			try {
				const postId = parseInt(id, 10);

				if (Number.isNaN(postId)) {
					Sentry.logger.warn("Invalid post ID for update", { id });
					return NextResponse.json(
						{ error: "Invalid post ID" },
						{ status: 400 },
					);
				}

				const body = await request.json();
				const data = updatePostSchema.parse(body);

				Sentry.logger.info("Updating post", {
					post_id: postId,
					updating_name: !!data.name,
					updating_description: data.description !== undefined,
					updating_content: !!data.content,
				});

				// Check if post exists
				const existingPost = await Sentry.startSpan(
					{ name: "db.post.findUnique", op: "db.query" },
					async () => {
						return db.post.findUnique({
							where: { id: postId },
						});
					},
				);

				if (!existingPost) {
					Sentry.logger.warn("Post not found for update", { post_id: postId });
					return NextResponse.json(
						{ error: "Post not found" },
						{ status: 404 },
					);
				}

				// If updating name, check for uniqueness
				if (data.name && data.name !== existingPost.name) {
					const postWithSameName = await Sentry.startSpan(
						{ name: "db.post.findUnique.checkName", op: "db.query" },
						async () => {
							return db.post.findUnique({
								where: { name: data.name },
							});
						},
					);

					if (postWithSameName) {
						Sentry.logger.warn("Update failed - duplicate name", {
							post_id: postId,
							attempted_name: data.name,
						});
						return NextResponse.json(
							{ error: "A post with this name already exists" },
							{ status: 409 },
						);
					}
				}

				const post = await Sentry.startSpan(
					{ name: "db.post.update", op: "db.query" },
					async () => {
						return db.post.update({
							where: { id: postId },
							data,
						});
					},
				);

				const duration = Date.now() - startTime;
				Sentry.logger.info("Post updated successfully", {
					post_id: post.id,
					post_name: post.name,
					duration_ms: duration,
				});

				return NextResponse.json({ data: post });
			} catch (error) {
				if (error instanceof z.ZodError) {
					Sentry.logger.warn("Post update validation failed", {
						post_id: id,
						errors: JSON.stringify(error.errors),
					});
					return NextResponse.json(
						{ error: "Validation failed", details: error.errors },
						{ status: 400 },
					);
				}

				Sentry.captureException(error, {
					tags: { api_route: "/api/posts/[id]", method: "PUT" },
					extra: { post_id: id },
				});
				Sentry.logger.error("Failed to update post", {
					post_id: id,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return NextResponse.json(
					{ error: "Failed to update post" },
					{ status: 500 },
				);
			}
		},
	);
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(_request: Request, { params }: RouteParams) {
	const { id } = await params;

	return Sentry.startSpan(
		{
			name: "DELETE /api/posts/[id]",
			op: "http.server",
			attributes: {
				"http.method": "DELETE",
				"http.route": "/api/posts/[id]",
				"post.id": id,
			},
		},
		async () => {
			const startTime = Date.now();

			try {
				const postId = parseInt(id, 10);

				if (Number.isNaN(postId)) {
					Sentry.logger.warn("Invalid post ID for deletion", { id });
					return NextResponse.json(
						{ error: "Invalid post ID" },
						{ status: 400 },
					);
				}

				Sentry.logger.info("Deleting post", { post_id: postId });

				const existingPost = await Sentry.startSpan(
					{ name: "db.post.findUnique", op: "db.query" },
					async () => {
						return db.post.findUnique({
							where: { id: postId },
						});
					},
				);

				if (!existingPost) {
					Sentry.logger.warn("Post not found for deletion", { post_id: postId });
					return NextResponse.json(
						{ error: "Post not found" },
						{ status: 404 },
					);
				}

				await Sentry.startSpan(
					{ name: "db.post.delete", op: "db.query" },
					async () => {
						return db.post.delete({
							where: { id: postId },
						});
					},
				);

				const duration = Date.now() - startTime;
				Sentry.logger.info("Post deleted successfully", {
					post_id: postId,
					post_name: existingPost.name,
					duration_ms: duration,
				});

				return NextResponse.json({ data: { success: true } });
			} catch (error) {
				Sentry.captureException(error, {
					tags: { api_route: "/api/posts/[id]", method: "DELETE" },
					extra: { post_id: id },
				});
				Sentry.logger.error("Failed to delete post", {
					post_id: id,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return NextResponse.json(
					{ error: "Failed to delete post" },
					{ status: 500 },
				);
			}
		},
	);
}
