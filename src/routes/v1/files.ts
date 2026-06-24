import { FastifyInstance } from "fastify";
import { FileController } from "../../controllers/file.controller.js";
import {
  fileParamsSchema,
  fileUploadResponseSchema,
  fileDeleteResponseSchema,
} from "../../schemas/file.schema.js";

const fileController = new FileController();

export async function fileRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/upload",
    {
      schema: {
        tags: ["Files"],
        description: "Загрузка файла (только изображения, до 5МБ)",
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        response: {
          201: fileUploadResponseSchema,
        },
      },
    },
    fileController.upload.bind(fileController),
  );

  fastify.delete(
    "/:filename",
    {
      schema: {
        tags: ["Files"],
        description: "Удаление файла",
        security: [{ bearerAuth: [] }],
        params: fileParamsSchema,
        response: {
          204: fileDeleteResponseSchema,
        },
      },
    },
    fileController.delete.bind(fileController),
  );
}
