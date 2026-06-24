import { z } from "zod";
import { RoomStatus } from "../entities/Room.js";
import { userSchema } from "./user.schema.js";
import { paginationQuerySchema, metaResponseSchema } from "./pagination.schema.js";

export const roomQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});
export type RoomQuerySchema = z.infer<typeof roomQuerySchema>;

export const createRoomRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});
export type CreateRoomRequestSchema = z.infer<typeof createRoomRequestSchema>;

export const createRoomResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.number().positive().int(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.enum(RoomStatus),
    createdAt: z.date(),
  }),
});
export type CreateRoomResponseSchema = z.infer<typeof createRoomResponseSchema>;

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(RoomStatus).optional(),
});
export type UpdateRoomSchema = z.infer<typeof updateRoomSchema>;

export const roomParamsSchema = z.object({
  id: z.coerce.number().positive().int(),
});
export type RoomParamsSchema = z.infer<typeof roomParamsSchema>;

const roomSchema = z.object({
  id: z.number().positive().int(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(RoomStatus),
  owner: userSchema,
  createdAt: z.date(),
});
export const roomResponseSchema = z.object({
  success: z.boolean(),
  data: roomSchema,
});
export type RoomResponseSchema = z.infer<typeof roomResponseSchema>;

export const roomsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(roomSchema),
  meta: metaResponseSchema,
});
export type RoomsResponseSchema = z.infer<typeof roomsResponseSchema>;

export const deleteRoomResponseScheme = z.null().meta({ description: "No content" });
