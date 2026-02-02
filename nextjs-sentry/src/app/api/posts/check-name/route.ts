import { NextResponse } from "next/server";
import { db } from "~/server/db";

// GET /api/posts/check-name - Check if a name is available
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const name = searchParams.get("name");
		const excludeId = searchParams.get("excludeId");

		if (!name) {
			return NextResponse.json(
				{ error: "Name parameter is required" },
				{ status: 400 },
			);
		}

		const existingPost = await db.post.findUnique({
			where: { name },
		});

		if (!existingPost) {
			return NextResponse.json({ data: { available: true } });
		}

		// If we're excluding an ID (for update scenarios), check if it's the same post
		if (excludeId) {
			const excludeIdNum = parseInt(excludeId, 10);
			if (!Number.isNaN(excludeIdNum) && existingPost.id === excludeIdNum) {
				return NextResponse.json({ data: { available: true } });
			}
		}

		return NextResponse.json({ data: { available: false } });
	} catch {
		return NextResponse.json(
			{ error: "Failed to check name availability" },
			{ status: 500 },
		);
	}
}
