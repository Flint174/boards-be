import { z } from "zod";
import { userSchema } from "./user.schema.js";
import { paginationQuerySchema, metaResponseSchema } from "./pagination.schema.js";

// Request schemas

export const createBoardRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  roomId: z.number().positive().int(),
});
export type CreateBoardRequestSchema = z.infer<typeof createBoardRequestSchema>;

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});
export type UpdateBoardSchema = z.infer<typeof updateBoardSchema>;

export const boardParamsSchema = z.object({
  id: z.coerce.number().positive().int(),
});
export type BoardParamsSchema = z.infer<typeof boardParamsSchema>;

// Query schemas

export const boardQuerySchema = paginationQuerySchema.extend({
  roomId: z.coerce.number().positive().int(),
});
export type BoardQuerySchema = z.infer<typeof boardQuerySchema>;

// Response schemas

const boardSchema = z.object({
  id: z.number().positive().int(),
  name: z.string(),
  description: z.string().nullable(),
  owner: userSchema,
  createdAt: z.date(),
});

export const createBoardResponseSchema = z.object({
  success: z.boolean(),
  data: boardSchema,
});
export type CreateBoardResponseSchema = z.infer<typeof createBoardResponseSchema>;

export const boardResponseSchema = z.object({
  success: z.boolean(),
  data: boardSchema,
});
export type BoardResponseSchema = z.infer<typeof boardResponseSchema>;

export const boardsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(boardSchema),
  meta: metaResponseSchema,
});
export type BoardsResponseSchema = z.infer<typeof boardsResponseSchema>;

export const deleteBoardResponseSchema = z.null().meta({ description: "No content" });
