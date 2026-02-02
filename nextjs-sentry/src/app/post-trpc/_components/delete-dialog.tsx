"use client";

import { Button } from "~/app/_components/ui/button";
import { Modal } from "~/app/_components/ui/modal";
import { api } from "~/trpc/react";

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: number;
    name: string;
  } | null;
  onSuccess: () => void;
}

export function DeleteDialog({
  isOpen,
  onClose,
  post,
  onSuccess,
}: DeleteDialogProps) {
  const utils = api.useUtils();

  const deletePost = api.post.delete.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      onSuccess();
      onClose();
    },
  });

  const handleDelete = () => {
    if (post) {
      deletePost.mutate({ id: post.id });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Delete Post">
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900">"{post?.name}"</span>?
          This action cannot be undone.
        </p>

        {deletePost.error && (
          <div className="rounded-lg bg-red-50 p-3 text-red-600 text-sm">
            {deletePost.error.message ||
              "Failed to delete post. Please try again."}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            isLoading={deletePost.isPending}
            onClick={handleDelete}
            type="button"
            variant="danger"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
