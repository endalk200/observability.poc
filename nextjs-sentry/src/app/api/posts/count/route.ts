import { NextResponse } from "next/server";
import { db } from "~/server/db";

// GET /api/posts/count - Get total count of posts
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const search = searchParams.get("search");

		const where = search
			? {
					OR: [
						{ name: { contains: search } },
						{ description: { contains: search } },
						{ content: { contains: search } },
					],
				}
			: {};

		const count = await db.post.count({ where });

		return NextResponse.json({ data: { count } });
	} catch {
		return NextResponse.json(
			{ error: "Failed to count posts" },
			{ status: 500 },
		);
	}
}
