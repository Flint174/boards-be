import { z } from "zod";

export const fileParamsSchema = z.object({
  filename: z.string(),
});
export type FileParamsSchema = z.infer<typeof fileParamsSchema>;

export const fileUploadResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    url: z.string(),
    filename: z.string(),
    originalName: z.string(),
    size: z.number(),
  }),
});
export type FileUploadResponseSchema = z.infer<typeof fileUploadResponseSchema>;

export const fileDeleteResponseSchema = z.null().meta({ description: "No content" });
