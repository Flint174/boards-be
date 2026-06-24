import { z } from "zod";
import { paginationQuerySchema, metaResponseSchema } from "./pagination.schema.js";

export const registerRequestSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});
export type RegisterRequestSchema = z.infer<typeof registerRequestSchema>;

export const userSchema = z.object({
  id: z.number().positive().int(),
  email: z.email(),
  name: z.string(),
  createdAt: z.date(),
});

export const registerResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: userSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});
export type RegisterResponseSchema = z.infer<typeof registerResponseSchema>;

export const loginRequestSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequestSchema = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = registerResponseSchema;
export type LoginResponseSchema = z.infer<typeof loginResponseSchema>;

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
export type RefreshTokenSchema = z.infer<typeof refreshTokenRequestSchema>;

export const refreshTokenResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});
export type RefreshTokenResponseSchema = z.infer<typeof refreshTokenResponseSchema>;

export const profileResponseSchema = z.object({
  success: z.boolean(),
  data: userSchema,
});
export type ProfileResponseSchema = z.infer<typeof profileResponseSchema>;

export const logoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type LogoutResponseSchema = z.infer<typeof logoutResponseSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z.email("Invalid email format").optional(),
});
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;

export const userQuerySchema = paginationQuerySchema;
export type UserQuerySchema = z.infer<typeof userQuerySchema>;

export const usersResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(userSchema),
  meta: metaResponseSchema,
});
export type UsersResponseSchema = z.infer<typeof usersResponseSchema>;

export const userParamsSchema = z.object({
  id: z.coerce.number().positive().int(),
});
export type UserParamsSchema = z.infer<typeof userParamsSchema>;
