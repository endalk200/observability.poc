"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Textarea } from "~/app/_components/ui/textarea";
import { type Post, useCreatePostApi, useUpdatePostApi } from "./api-client";

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

interface PostFormApiProps {
  mode: "create" | "edit";
  initialData?: Pick<Post, "id" | "name" | "description" | "content">;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PostFormApi({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: PostFormApiProps) {
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

  const createPost = useCreatePostApi();
  const updatePost = useUpdatePostApi();

  const isLoading = createPost.isPending || updatePost.isPending;

  const onSubmit = async (data: PostFormValues) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
      content: data.content,
    };

    try {
      if (mode === "create") {
        await createPost.mutateAsync(payload);
      } else if (initialData) {
        await updatePost.mutateAsync({
          id: initialData.id,
          ...payload,
        });
      }
      reset();
      onSuccess();
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        setError("name", {
          type: "server",
          message:
            "A post with this name already exists. Please choose a different name.",
        });
      }
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
