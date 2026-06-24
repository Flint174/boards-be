import { randomUUID } from "node:crypto";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/tiff",
  "image/bmp",
];

const UPLOAD_DIR = path.join(process.cwd(), "public");
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export class FileService {
  async ensureUploadDir(): Promise<void> {
    try {
      await access(UPLOAD_DIR);
    } catch {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
  }> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error("Only image files are allowed");
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error("File size must not exceed 5MB");
    }

    await this.ensureUploadDir();

    const ext = this.getExtension(originalName);
    const filename = `${randomUUID()}${ext}`;

    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return {
      url: `/uploads/${filename}`,
      filename,
      originalName,
      size: buffer.length,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
      await access(filepath);
    } catch {
      throw new Error("File not found");
    }

    await unlink(filepath);
  }

  private getExtension(filename: string): string {
    const idx = filename.lastIndexOf(".");
    return idx === -1 ? "" : filename.substring(idx);
  }
}
