import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  formatUploadLimit,
  getAllowedUpload,
  MAX_AUDIO_UPLOAD_BYTES,
  validateUploadSignature,
} from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn file audio." },
        { status: 400 },
      );
    }

    const uploadType = getAllowedUpload(file.type, ["audio"], file.name);
    if (!uploadType) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ MP3, WAV, OGG, WEBM, M4A hoặc AAC." },
        { status: 400 },
      );
    }
    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File audio khong duoc vuot qua ${formatUploadLimit(MAX_AUDIO_UPLOAD_BYTES)}.` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateUploadSignature(buffer, file.type, file.name)) {
      return NextResponse.json(
        { error: "Nội dung file audio không hợp lệ." },
        { status: 400 },
      );
    }

    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "question-audio",
    );
    await mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${uploadType.extension}`;
    await writeFile(
      path.join(uploadsDir, filename),
      buffer,
    );

    return NextResponse.json({
      url: `/uploads/question-audio/${filename}`,
      filename: file.name,
      type: file.type,
    });
  } catch (error) {
    console.error("Error uploading question audio:", error);
    return NextResponse.json(
      { error: "Không thể tải audio lên." },
      { status: 500 },
    );
  }
}
