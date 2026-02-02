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
	try {
		const { id } = await params;
		const postId = parseInt(id, 10);

		if (Number.isNaN(postId)) {
			return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
		}

		const post = await db.post.findUnique({
			where: { id: postId },
		});

		if (!post) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		return NextResponse.json({ data: post });
	} catch {
		return NextResponse.json(
			{ error: "Failed to fetch post" },
			{ status: 500 },
		);
	}
}

// PUT /api/posts/[id] - Update a post
export async function PUT(request: Request, { params }: RouteParams) {
	try {
		const { id } = await params;
		const postId = parseInt(id, 10);

		if (Number.isNaN(postId)) {
			return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
		}

		const body = await request.json();
		const data = updatePostSchema.parse(body);

		// Check if post exists
		const existingPost = await db.post.findUnique({
			where: { id: postId },
		});

		if (!existingPost) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		// If updating name, check for uniqueness
		if (data.name && data.name !== existingPost.name) {
			const postWithSameName = await db.post.findUnique({
				where: { name: data.name },
			});

			if (postWithSameName) {
				return NextResponse.json(
					{ error: "A post with this name already exists" },
					{ status: 409 },
				);
			}
		}

		const post = await db.post.update({
			where: { id: postId },
			data,
		});

		return NextResponse.json({ data: post });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.errors },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Failed to update post" },
			{ status: 500 },
		);
	}
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(_request: Request, { params }: RouteParams) {
	try {
		const { id } = await params;
		const postId = parseInt(id, 10);

		if (Number.isNaN(postId)) {
			return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
		}

		const existingPost = await db.post.findUnique({
			where: { id: postId },
		});

		if (!existingPost) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		await db.post.delete({
			where: { id: postId },
		});

		return NextResponse.json({ data: { success: true } });
	} catch {
		return NextResponse.json(
			{ error: "Failed to delete post" },
			{ status: 500 },
		);
	}
}
