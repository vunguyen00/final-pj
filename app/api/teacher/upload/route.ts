import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedUpload, validateUploadSignature } from "@/lib/upload-validation";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const uploadType = getAllowedUpload(file.type, ["video"]);
    if (!uploadType) {
      return NextResponse.json(
        { error: "Invalid file type. Only video files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 500MB." },
        { status: 400 }
      );
    }

    const uploadsDir = join(process.cwd(), "public", "videos");
    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (!validateUploadSignature(buffer, file.type)) {
      return NextResponse.json(
        { error: "Invalid video file content." },
        { status: 400 }
      );
    }

    const filename = `${Date.now()}-${randomUUID()}.${uploadType.extension}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const videoUrl = `/videos/${filename}`;

    return NextResponse.json({ 
      success: true, 
      url: videoUrl,
      filename: file.name
    });
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}
