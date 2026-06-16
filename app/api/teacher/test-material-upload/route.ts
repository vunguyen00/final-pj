import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["application/pdf", "pdf"],
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
        { error: "Vui lòng chọn ảnh hoặc PDF." },
        { status: 400 },
      );
    }

    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ JPG, PNG, WEBP, GIF hoặc PDF." },
        { status: 400 },
      );
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Tệp không được vượt quá 15 MB." },
        { status: 400 },
      );
    }

    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "test-materials",
    );
    await mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    await writeFile(
      path.join(uploadsDir, filename),
      Buffer.from(await file.arrayBuffer()),
    );

    return NextResponse.json({
      url: `/uploads/test-materials/${filename}`,
      type: file.type === "application/pdf" ? "PDF" : "IMAGE",
      filename: file.name,
    });
  } catch (error) {
    console.error("Error uploading test material:", error);
    return NextResponse.json(
      { error: "Không thể tải tài liệu lên." },
      { status: 500 },
    );
  }
}
