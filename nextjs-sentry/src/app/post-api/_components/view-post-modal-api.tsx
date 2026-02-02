"use client";

import { Button } from "~/app/_components/ui/button";
import { Modal } from "~/app/_components/ui/modal";
import type { Post } from "./api-client";

interface ViewPostModalApiProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onEdit: () => void;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function ViewPostModalApi({
  isOpen,
  onClose,
  post,
  onEdit,
}: ViewPostModalApiProps) {
  if (!post) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={post.name}>
      <div className="space-y-4">
        {post.description && (
          <p className="text-gray-600 italic">{post.description}</p>
        )}

        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{post.content}</p>
        </div>

        <div className="border-gray-200 border-t pt-4">
          <div className="flex items-center justify-between text-gray-500 text-sm">
            <div>
              <p>Created: {formatDate(post.createdAt)}</p>
              {post.updatedAt !== post.createdAt && (
                <p>Updated: {formatDate(post.updatedAt)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
          <Button onClick={onEdit} type="button">
            Edit Post
          </Button>
        </div>
      </div>
    </Modal>
  );
}
