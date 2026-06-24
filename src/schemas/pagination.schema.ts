import { z } from "zod";
import { PAGINATION } from "../constants/pagination.js";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.PAGE).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGINATION.LIMIT).optional(),
});
export type PaginationQuerySchema = z.infer<typeof paginationQuerySchema>;

export const metaResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});
export type MetaResponseSchema = z.infer<typeof metaResponseSchema>;
