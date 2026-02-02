import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types
export type Post = {
  id: number;
  name: string;
  description: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePostInput = {
  name: string;
  description?: string;
  content: string;
};

export type UpdatePostInput = {
  id: number;
  name?: string;
  description?: string | null;
  content?: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
  details?: Array<{ message: string; path: string[] }>;
};

// API helper functions
async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(json.error || "An error occurred");
  }

  return json;
}

// Query keys
export const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (filters: { search?: string }) =>
    [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: number) => [...postKeys.details(), id] as const,
  count: (search?: string) => [...postKeys.all, "count", search] as const,
};

// Hooks
export function usePostsApi(search?: string) {
  return useQuery({
    queryKey: postKeys.list({ search }),
    queryFn: async () => {
      const url = new URL("/api/posts", window.location.origin);
      if (search) url.searchParams.set("search", search);
      const response = await fetchApi<Post[]>(url.toString());
      return response.data ?? [];
    },
  });
}

export function usePostApi(id: number) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: async () => {
      const response = await fetchApi<Post>(`/api/posts/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePostCountApi(search?: string) {
  return useQuery({
    queryKey: postKeys.count(search),
    queryFn: async () => {
      const url = new URL("/api/posts/count", window.location.origin);
      if (search) url.searchParams.set("search", search);
      const response = await fetchApi<{ count: number }>(url.toString());
      return response.data?.count ?? 0;
    },
  });
}

export function useCreatePostApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await fetchApi<Post>("/api/posts", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useUpdatePostApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePostInput) => {
      const response = await fetchApi<Post>(`/api/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useDeletePostApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await fetchApi(`/api/posts/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}
