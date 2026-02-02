"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Textarea } from "~/app/_components/ui/textarea";
import { api } from "~/trpc/react";

const postFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  content: z.string().min(1, "Content is required"),
});

type PostFormValues = z.infer<typeof postFormSchema>;

interface PostFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: number;
    name: string;
    description: string | null;
    content: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function PostForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: PostFormProps) {
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    reset,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      content: initialData?.content ?? "",
    },
  });

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      reset();
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes("already exists")) {
        setError("name", {
          type: "server",
          message:
            "A post with this name already exists. Please choose a different name.",
        });
      }
    },
  });

  const updatePost = api.post.update.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes("already exists")) {
        setError("name", {
          type: "server",
          message:
            "A post with this name already exists. Please choose a different name.",
        });
      }
    },
  });

  const isLoading = createPost.isPending || updatePost.isPending;

  const onSubmit = (data: PostFormValues) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
      content: data.content,
    };

    if (mode === "create") {
      createPost.mutate(payload);
    } else if (initialData) {
      updatePost.mutate({
        id: initialData.id,
        ...payload,
      });
    }
  };

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description ?? "",
        content: initialData.content,
      });
    }
  }, [initialData, reset]);

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Input
        error={errors.name?.message}
        label="Title"
        placeholder="Enter a unique title for your post"
        {...register("name")}
      />

      <Input
        error={errors.description?.message}
        label="Description (optional)"
        placeholder="A brief description of your post"
        {...register("description")}
      />

      <Textarea
        error={errors.content?.message}
        label="Content"
        placeholder="Write your post content here..."
        rows={6}
        {...register("content")}
      />

      {(createPost.error || updatePost.error) &&
        !errors.name &&
        !errors.description &&
        !errors.content && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600 text-sm">
            {createPost.error?.message ||
              updatePost.error?.message ||
              "An error occurred. Please try again."}
          </div>
        )}

      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button isLoading={isLoading} type="submit">
          {mode === "create" ? "Create Post" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
