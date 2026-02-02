import * as Sentry from "@sentry/nextjs";
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
			Sentry.logger.info("tRPC post.create called", {
				post_name: input.name,
				has_description: !!input.description,
				content_length: input.content.length,
			});

			// Check if post with this name already exists
			const existingPost = await ctx.db.post.findUnique({
				where: { name: input.name },
			});

			if (existingPost) {
				Sentry.logger.warn("tRPC post.create failed - duplicate name", {
					post_name: input.name,
					existing_post_id: existingPost.id,
				});
				throw new TRPCError({
					code: "CONFLICT",
					message: "A post with this name already exists",
				});
			}

			const post = await ctx.db.post.create({
				data: {
					name: input.name,
					description: input.description,
					content: input.content,
				},
			});

			Sentry.logger.info("tRPC post.create succeeded", {
				post_id: post.id,
				post_name: post.name,
			});

			return post;
		}),

	// Get a single post by ID
	getById: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ ctx, input }) => {
			Sentry.logger.info("tRPC post.getById called", { post_id: input.id });

			const post = await ctx.db.post.findUnique({
				where: { id: input.id },
			});

			if (!post) {
				Sentry.logger.warn("tRPC post.getById - post not found", {
					post_id: input.id,
				});
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Post not found",
				});
			}

			Sentry.logger.info("tRPC post.getById succeeded", {
				post_id: post.id,
				post_name: post.name,
			});

			return post;
		}),

	// Get a single post by name
	getByName: publicProcedure
		.input(z.object({ name: z.string() }))
		.query(async ({ ctx, input }) => {
			Sentry.logger.info("tRPC post.getByName called", {
				post_name: input.name,
			});

			const post = await ctx.db.post.findUnique({
				where: { name: input.name },
			});

			if (!post) {
				Sentry.logger.warn("tRPC post.getByName - post not found", {
					post_name: input.name,
				});
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Post not found",
				});
			}

			Sentry.logger.info("tRPC post.getByName succeeded", {
				post_id: post.id,
				post_name: post.name,
			});

			return post;
		}),

	// Get the latest post
	getLatest: publicProcedure.query(async ({ ctx }) => {
		Sentry.logger.info("tRPC post.getLatest called");

		const post = await ctx.db.post.findFirst({
			orderBy: { createdAt: "desc" },
		});

		Sentry.logger.info("tRPC post.getLatest completed", {
			found: !!post,
			post_id: post?.id ?? null,
		});

		return post ?? null;
	}),

	// List all posts with pagination, search, and sorting
	list: publicProcedure.input(listPostsSchema).query(async ({ ctx, input }) => {
		const { limit, cursor, search, orderBy, orderDir } = input;

		Sentry.logger.info("tRPC post.list called", {
			limit,
			cursor: cursor ?? null,
			search: search ?? null,
			order_by: orderBy,
			order_dir: orderDir,
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

		Sentry.logger.info("tRPC post.list completed", {
			items_count: items.length,
			has_next_page: !!nextCursor,
			next_cursor: nextCursor ?? null,
		});

		return {
			items,
			nextCursor,
		};
	}),

	// Get all posts (simple list without pagination)
	getAll: publicProcedure.query(async ({ ctx }) => {
		Sentry.logger.info("tRPC post.getAll called");

		const posts = await ctx.db.post.findMany({
			orderBy: { createdAt: "desc" },
		});

		Sentry.logger.info("tRPC post.getAll completed", {
			count: posts.length,
		});

		return posts;
	}),

	// Get total count of posts
	count: publicProcedure
		.input(z.object({ search: z.string().optional() }).optional())
		.query(async ({ ctx, input }) => {
			Sentry.logger.info("tRPC post.count called", {
				search: input?.search ?? null,
			});

			const where = input?.search
				? {
						OR: [
							{ name: { contains: input.search } },
							{ description: { contains: input.search } },
							{ content: { contains: input.search } },
						],
					}
				: {};

			const count = await ctx.db.post.count({ where });

			Sentry.logger.info("tRPC post.count completed", {
				count,
				has_search: !!input?.search,
			});

			return count;
		}),

	// Update a post
	update: publicProcedure
		.input(updatePostSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			Sentry.logger.info("tRPC post.update called", {
				post_id: id,
				updating_name: !!data.name,
				updating_description: data.description !== undefined,
				updating_content: !!data.content,
			});

			// Check if post exists
			const existingPost = await ctx.db.post.findUnique({
				where: { id },
			});

			if (!existingPost) {
				Sentry.logger.warn("tRPC post.update - post not found", { post_id: id });
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
					Sentry.logger.warn("tRPC post.update failed - duplicate name", {
						post_id: id,
						attempted_name: data.name,
					});
					throw new TRPCError({
						code: "CONFLICT",
						message: "A post with this name already exists",
					});
				}
			}

			const post = await ctx.db.post.update({
				where: { id },
				data,
			});

			Sentry.logger.info("tRPC post.update succeeded", {
				post_id: post.id,
				post_name: post.name,
			});

			return post;
		}),

	// Delete a post
	delete: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			Sentry.logger.info("tRPC post.delete called", { post_id: input.id });

			const existingPost = await ctx.db.post.findUnique({
				where: { id: input.id },
			});

			if (!existingPost) {
				Sentry.logger.warn("tRPC post.delete - post not found", {
					post_id: input.id,
				});
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Post not found",
				});
			}

			const deletedPost = await ctx.db.post.delete({
				where: { id: input.id },
			});

			Sentry.logger.info("tRPC post.delete succeeded", {
				post_id: deletedPost.id,
				post_name: deletedPost.name,
			});

			return deletedPost;
		}),

	// Check if a name is available
	checkNameAvailability: publicProcedure
		.input(z.object({ name: z.string(), excludeId: z.number().optional() }))
		.query(async ({ ctx, input }) => {
			Sentry.logger.info("tRPC post.checkNameAvailability called", {
				name: input.name,
				exclude_id: input.excludeId ?? null,
			});

			const existingPost = await ctx.db.post.findUnique({
				where: { name: input.name },
			});

			if (!existingPost) {
				Sentry.logger.info("tRPC post.checkNameAvailability - name available", {
					name: input.name,
					available: true,
				});
				return { available: true };
			}

			// If we're excluding an ID (for update scenarios), check if it's the same post
			if (input.excludeId && existingPost.id === input.excludeId) {
				Sentry.logger.info(
					"tRPC post.checkNameAvailability - name available (same post)",
					{
						name: input.name,
						available: true,
						exclude_id: input.excludeId,
					},
				);
				return { available: true };
			}

			Sentry.logger.info(
				"tRPC post.checkNameAvailability - name not available",
				{
					name: input.name,
					available: false,
					existing_post_id: existingPost.id,
				},
			);
			return { available: false };
		}),
});
