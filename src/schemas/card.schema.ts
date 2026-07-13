import { z } from "zod";
import { CardStatus } from "../entities/Card.js";
import { userSchema } from "./user.schema.js";
import { paginationQuerySchema, metaResponseSchema } from "./pagination.schema.js";

// Request schemas

export const createCardRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  boardId: z.number().positive().int(),
});
export type CreateCardRequestSchema = z.infer<typeof createCardRequestSchema>;

export const updateCardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(CardStatus).optional(),
});
export type UpdateCardSchema = z.infer<typeof updateCardSchema>;

export const cardParamsSchema = z.object({
  id: z.coerce.number().positive().int(),
});
export type CardParamsSchema = z.infer<typeof cardParamsSchema>;

// Sort enums

export const cardSortSchema = z.enum(["votes", "date", "comments", "alphabet"]);
export type CardSort = z.infer<typeof cardSortSchema>;

export const cardSortOrderSchema = z.enum(["ASC", "DESC"]);
export type CardSortOrder = z.infer<typeof cardSortOrderSchema>;

// Query schemas

export const cardQuerySchema = paginationQuerySchema.extend({
  boardId: z.coerce.number().positive().int(),
  sort: cardSortSchema.optional(),
  sortOrder: cardSortOrderSchema.optional(),
  status: z.enum(CardStatus).optional(),
});
export type CardQuerySchema = z.infer<typeof cardQuerySchema>;

// Vote params

export const voteParamsSchema = z.object({
  id: z.coerce.number().positive().int(),
});
export type VoteParamsSchema = z.infer<typeof voteParamsSchema>;

// Response schemas

const cardSchema = z.object({
  id: z.number().positive().int(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(CardStatus),
  order: z.number().int(),
  votesCount: z.number().int(),
  commentsCount: z.number().int(),
  owner: userSchema,
  createdAt: z.date(),
});

const cardWithVotedSchema = cardSchema.extend({
  voted: z.boolean(),
});

export const createCardResponseSchema = z.object({
  success: z.boolean(),
  data: cardSchema,
});
export type CreateCardResponseSchema = z.infer<typeof createCardResponseSchema>;

export const cardResponseSchema = z.object({
  success: z.boolean(),
  data: cardSchema,
});
export type CardResponseSchema = z.infer<typeof cardResponseSchema>;

export const cardWithVotedResponseSchema = z.object({
  success: z.boolean(),
  data: cardWithVotedSchema,
});
export type CardWithVotedResponseSchema = z.infer<typeof cardWithVotedResponseSchema>;

export const cardsWithVotedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(cardWithVotedSchema),
  meta: metaResponseSchema,
});
export type CardsWithVotedResponseSchema = z.infer<typeof cardsWithVotedResponseSchema>;

export const voteResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    votesCount: z.number().int(),
    voted: z.boolean(),
  }),
});
export type VoteResponseSchema = z.infer<typeof voteResponseSchema>;

export const deleteCardResponseSchema = z.null().meta({ description: "No content" });
