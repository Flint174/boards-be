import { z } from "zod";
import { userSchema } from "./user.schema.js";
import { paginationQuerySchema, metaResponseSchema } from "./pagination.schema.js";

export const createCommentRequestSchema = z.object({
  content: z.string().min(1).max(10000),
  cardId: z.number().positive().int(),
  parentId: z.number().positive().int().optional(),
});
export type CreateCommentRequestSchema = z.infer<typeof createCommentRequestSchema>;

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});
export type UpdateCommentSchema = z.infer<typeof updateCommentSchema>;

export const commentParamsSchema = z.object({
  id: z.coerce.number().positive().int(),
});
export type CommentParamsSchema = z.infer<typeof commentParamsSchema>;

export const commentQuerySchema = paginationQuerySchema.merge(
  z.object({ cardId: z.coerce.number().positive().int() }),
);
export type CommentQuerySchema = z.infer<typeof commentQuerySchema>;

const commentSchema = z.object({
  id: z.number().positive().int(),
  content: z.string(),
  author: userSchema,
  // parentId: z.number().positive().int().nullable(),
  parent: z.object({ id: z.number().positive().int() }).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createCommentResponseSchema = z.object({
  success: z.boolean(),
  data: commentSchema,
});
export type CreateCommentResponseSchema = z.infer<typeof createCommentResponseSchema>;

export const commentResponseSchema = z.object({
  success: z.boolean(),
  data: commentSchema,
});
export type CommentResponseSchema = z.infer<typeof commentResponseSchema>;

export const commentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(commentSchema),
  meta: metaResponseSchema,
});
export type CommentsResponseSchema = z.infer<typeof commentsResponseSchema>;

export const deleteCommentResponseSchema = z.null().meta({ description: "No content" });
