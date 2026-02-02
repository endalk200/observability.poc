"use client";

interface PostCardProps {
  post: {
    id: number;
    name: string;
    description: string | null;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  };
  onEdit: (post: PostCardProps["post"]) => void;
  onDelete: (post: PostCardProps["post"]) => void;
  onView: (post: PostCardProps["post"]) => void;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function PostCard({ post, onEdit, onDelete, onView }: PostCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-primary-200 hover:shadow-md">
      <div className="p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="line-clamp-1 font-semibold text-gray-900 text-lg group-hover:text-primary-600">
            {post.name}
          </h3>
          <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-600 text-xs">
            {formatDate(post.createdAt)}
          </span>
        </div>

        {post.description && (
          <p className="mb-3 line-clamp-2 text-gray-600 text-sm">
            {post.description}
          </p>
        )}

        <p className="line-clamp-3 text-gray-500 text-sm">{post.content}</p>

        <div className="mt-4 flex items-center justify-between border-gray-100 border-t pt-4">
          <button
            className="font-medium text-primary-600 text-sm transition-colors hover:text-primary-700"
            onClick={() => onView(post)}
            type="button"
          >
            Read more
          </button>

          <div className="flex items-center gap-2">
            <button
              aria-label="Edit post"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              onClick={() => onEdit(post)}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
            <button
              aria-label="Delete post"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              onClick={() => onDelete(post)}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
