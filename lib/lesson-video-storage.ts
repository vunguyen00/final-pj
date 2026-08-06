import { unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";

function getLocalVideoPath(videoUrl: string | null | undefined) {
  if (!videoUrl?.startsWith("/videos/")) return null;
  const fileName = videoUrl.replace("/videos/", "").trim();
  if (!fileName || fileName.includes("/") || fileName.includes("\\")) return null;
  return join(process.cwd(), "public", "videos", fileName);
}

export async function cleanupLessonVideoIfUnused(
  videoUrl: string | null | undefined,
  excludeLessonId?: string,
) {
  if (!videoUrl) return;
  const inUseCount = await prisma.lesson.count({
    where: {
      videoUrl,
      ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
    },
  });
  if (inUseCount > 0) return;

  const localPath = getLocalVideoPath(videoUrl);
  if (!localPath) return;

  try {
    await unlink(localPath);
  } catch {
    // The file may already have been removed. Database deletion still succeeded.
  }
}
