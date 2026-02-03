import { z } from "zod";

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export const updateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
