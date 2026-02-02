import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Shared schemas for validation
export const createPostSchema = z.object({
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

export const updatePostSchema = z.object({
	id: z.number(),
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

export const listPostsSchema = z.object({
	limit: z.number().min(1).max(100).default(10),
	cursor: z.number().nullish(),
	search: z.string().optional(),
	orderBy: z.enum(["createdAt", "updatedAt", "name"]).default("createdAt"),
	orderDir: z.enum(["asc", "desc"]).default("desc"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ListPostsInput = z.infer<typeof listPostsSchema>;

export const postRouter = createTRPCRouter({
	// Create a new post
	create: publicProcedure
		.input(createPostSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if post with this name already exists
			const existingPost = await ctx.db.post.findUnique({
				where: { name: input.name },
			});

			if (existingPost) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "A post with this name already exists",
				});
			}

			return ctx.db.post.create({
				data: {
					name: input.name,
					description: input.description,
					content: input.content,
				},
			});
		}),

	// Get a single post by ID
	getById: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ ctx, input }) => {
			const post = await ctx.db.post.findUnique({
				where: { id: input.id },
			});

			if (!post) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Post not found",
				});
			}

			return post;
		}),

	// Get a single post by name
	getByName: publicProcedure
		.input(z.object({ name: z.string() }))
		.query(async ({ ctx, input }) => {
			const post = await ctx.db.post.findUnique({
				where: { name: input.name },
			});

			if (!post) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Post not found",
				});
			}

			return post;
		}),

	// Get the latest post
	getLatest: publicProcedure.query(async ({ ctx }) => {
		const post = await ctx.db.post.findFirst({
			orderBy: { createdAt: "desc" },
		});

		return post ?? null;
	}),

	// List all posts with pagination, search, and sorting
	list: publicProcedure.input(listPostsSchema).query(async ({ ctx, input }) => {
		const { limit, cursor, search, orderBy, orderDir } = input;

		const where = search
			? {
					OR: [
						{ name: { contains: search } },
						{ description: { contains: search } },
						{ content: { contains: search } },
					],
				}
			: {};

		const items = await ctx.db.post.findMany({
			take: limit + 1,
			where,
			cursor: cursor ? { id: cursor } : undefined,
			orderBy: { [orderBy]: orderDir },
		});

		let nextCursor: typeof cursor | undefined;
		if (items.length > limit) {
			const nextItem = items.pop();
			nextCursor = nextItem?.id;
		}

		return {
			items,
			nextCursor,
		};
	}),

	// Get all posts (simple list without pagination)
	getAll: publicProcedure.query(async ({ ctx }) => {
		return ctx.db.post.findMany({
			orderBy: { createdAt: "desc" },
		});
	}),

	// Get total count of posts
	count: publicProcedure
		.input(z.object({ search: z.string().optional() }).optional())
		.query(async ({ ctx, input }) => {
			const where = input?.search
				? {
						OR: [
							{ name: { contains: input.search } },
							{ description: { contains: input.search } },
							{ content: { contains: input.search } },
						],
					}
				: {};

			return ctx.db.post.count({ where });
		}),

	// Update a post
	update: publicProcedure
		.input(updatePostSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			// Check if post exists
			const existingPost = await ctx.db.post.findUnique({
				where: { id },
			});

			if (!existingPost) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Post not found",
				});
			}

			// If updating name, check for uniqueness
			if (data.name && data.name !== existingPost.name) {
				const postWithSameName = await ctx.db.post.findUnique({
					where: { name: data.name },
				});

				if (postWithSameName) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "A post with this name already exists",
					});
				}
			}

			return ctx.db.post.update({
				where: { id },
				data,
			});
		}),

	// Delete a post
	delete: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existingPost = await ctx.db.post.findUnique({
				where: { id: input.id },
			});

			if (!existingPost) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Post not found",
				});
			}

			return ctx.db.post.delete({
				where: { id: input.id },
			});
		}),

	// Check if a name is available
	checkNameAvailability: publicProcedure
		.input(z.object({ name: z.string(), excludeId: z.number().optional() }))
		.query(async ({ ctx, input }) => {
			const existingPost = await ctx.db.post.findUnique({
				where: { name: input.name },
			});

			if (!existingPost) {
				return { available: true };
			}

			// If we're excluding an ID (for update scenarios), check if it's the same post
			if (input.excludeId && existingPost.id === input.excludeId) {
				return { available: true };
			}

			return { available: false };
		}),
});
