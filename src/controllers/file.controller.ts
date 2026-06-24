import { FastifyRequest, FastifyReply } from "fastify";
import { FileService } from "../services/file.service.js";
import {
  FileParamsSchema,
  FileUploadResponseSchema,
} from "../schemas/file.schema.js";
import { ERROR_RESPONSE, NOT_FOUND_RESPONSE } from "../constants/responses.js";

const fileService = new FileService();

export class FileController {
  async upload(request: FastifyRequest, reply: FastifyReply) {
    try {
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({ success: false, error: "No file uploaded" });
      }

      const buffer = await file.toBuffer();
      const result = await fileService.saveFile(buffer, file.filename, file.mimetype);

      const response: FileUploadResponseSchema = {
        success: true,
        data: result,
      };

      return reply.status(201).send(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Only image files are allowed") {
          return reply.status(400).send({ success: false, error: error.message });
        }

        if (error.message === "File size must not exceed 5MB") {
          return reply.status(413).send({ success: false, error: error.message });
        }
      }

      if (error instanceof Error) {
        if (error.message === "request file too large") {
          return reply.status(413).send({ success: false, error: "File size must not exceed 5MB" });
        }
      }

      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async delete(request: FastifyRequest<{ Params: FileParamsSchema }>, reply: FastifyReply) {
    try {
      const { filename } = request.params;

      await fileService.deleteFile(filename);

      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "File not found") {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }

      return reply.status(500).send(ERROR_RESPONSE);
    }
  }
}
