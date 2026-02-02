"use client";

import { useState } from "react";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Modal } from "~/app/_components/ui/modal";
import { api } from "~/trpc/react";
import { DeleteDialog } from "./delete-dialog";
import { PostCard } from "./post-card";
import { PostForm } from "./post-form";
import { ViewPostModal } from "./view-post-modal";

type Post = {
  id: number;
  name: string;
  description: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export function PostsList() {
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  const { data: posts, isLoading, error } = api.post.getAll.useQuery();
  const { data: postCount } = api.post.count.useQuery({});

  // Filter posts based on search
  const filteredPosts = posts?.filter((post) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      post.name.toLowerCase().includes(searchLower) ||
      post.description?.toLowerCase().includes(searchLower) ||
      post.content.toLowerCase().includes(searchLower)
    );
  });

  const handleViewToEdit = () => {
    if (viewingPost) {
      setEditingPost(viewingPost);
      setViewingPost(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with search and create button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <svg
            aria-hidden="true"
            className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <Input
            className="pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            type="search"
            value={search}
          />
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} type="button">
          <svg
            aria-hidden="true"
            className="mr-2 -ml-1 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 4v16m8-8H4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          New Post
        </Button>
      </div>

      {/* Posts count */}
      {postCount !== undefined && (
        <p className="text-gray-500 text-sm">
          {filteredPosts?.length === postCount
            ? `${postCount} ${postCount === 1 ? "post" : "posts"}`
            : `Showing ${filteredPosts?.length ?? 0} of ${postCount} posts`}
        </p>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500">
            <svg
              aria-hidden="true"
              className="h-6 w-6 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
              />
            </svg>
            <span>Loading posts...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <svg
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <h3 className="mt-3 font-medium text-lg text-red-800">
            Failed to load posts
          </h3>
          <p className="mt-1 text-red-600 text-sm">{error.message}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredPosts?.length === 0 && (
        <div className="rounded-lg border-2 border-gray-200 border-dashed p-12 text-center">
          <svg
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <h3 className="mt-4 font-medium text-gray-900 text-lg">
            {search ? "No posts found" : "No posts yet"}
          </h3>
          <p className="mt-1 text-gray-500 text-sm">
            {search
              ? "Try adjusting your search terms"
              : "Get started by creating your first post"}
          </p>
          {!search && (
            <Button
              className="mt-4"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              Create your first post
            </Button>
          )}
        </div>
      )}

      {/* Posts grid */}
      {!isLoading && !error && filteredPosts && filteredPosts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              onDelete={setDeletingPost}
              onEdit={setEditingPost}
              onView={setViewingPost}
              post={post}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        title="Create New Post"
      >
        <PostForm
          mode="create"
          onCancel={() => setIsCreateModalOpen(false)}
          onSuccess={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        size="lg"
        title="Edit Post"
      >
        {editingPost && (
          <PostForm
            initialData={editingPost}
            mode="edit"
            onCancel={() => setEditingPost(null)}
            onSuccess={() => setEditingPost(null)}
          />
        )}
      </Modal>

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onSuccess={() => setDeletingPost(null)}
        post={deletingPost}
      />

      {/* View Modal */}
      <ViewPostModal
        isOpen={!!viewingPost}
        onClose={() => setViewingPost(null)}
        onEdit={handleViewToEdit}
        post={viewingPost}
      />
    </div>
  );
}
