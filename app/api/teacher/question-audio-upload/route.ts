import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Map([
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/ogg", "ogg"],
  ["audio/webm", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/aac", "aac"],
]);

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

    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ MP3, WAV, OGG, WEBM, M4A hoặc AAC." },
        { status: 400 },
      );
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File audio không được vượt quá 25 MB." },
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
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    await writeFile(
      path.join(uploadsDir, filename),
      Buffer.from(await file.arrayBuffer()),
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
