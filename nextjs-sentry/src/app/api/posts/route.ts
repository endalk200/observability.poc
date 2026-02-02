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
	try {
		const { searchParams } = new URL(request.url);
		const query = listQuerySchema.parse({
			search: searchParams.get("search") ?? undefined,
			orderBy: searchParams.get("orderBy") ?? undefined,
			orderDir: searchParams.get("orderDir") ?? undefined,
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

		const posts = await db.post.findMany({
			where,
			orderBy: { [query.orderBy]: query.orderDir },
		});

		return NextResponse.json({ data: posts });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid query parameters", details: error.errors },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Failed to fetch posts" },
			{ status: 500 },
		);
	}
}

// POST /api/posts - Create a new post
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const data = createPostSchema.parse(body);

		// Check if post with this name already exists
		const existingPost = await db.post.findUnique({
			where: { name: data.name },
		});

		if (existingPost) {
			return NextResponse.json(
				{ error: "A post with this name already exists" },
				{ status: 409 },
			);
		}

		const post = await db.post.create({
			data: {
				name: data.name,
				description: data.description,
				content: data.content,
			},
		});

		return NextResponse.json({ data: post }, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.errors },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Failed to create post" },
			{ status: 500 },
		);
	}
}
