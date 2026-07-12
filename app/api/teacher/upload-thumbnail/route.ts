import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedUpload, validateUploadSignature } from "@/lib/upload-validation";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Vui lòng chọn một ảnh." }, { status: 400 });
    }

    const uploadType = getAllowedUpload(file.type, ["image"]);
    if (!uploadType) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc GIF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Ảnh không được lớn hơn 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateUploadSignature(buffer, file.type)) {
      return NextResponse.json({ error: "Nội dung file ảnh không hợp lệ." }, { status: 400 });
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "course-thumbnails");
    await mkdir(uploadDirectory, { recursive: true });

    const filename = `${randomUUID()}.${uploadType.extension}`;
    await writeFile(path.join(uploadDirectory, filename), buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/course-thumbnails/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading course thumbnail:", error);
    return NextResponse.json({ error: "Không thể tải ảnh lên." }, { status: 500 });
  }
}
