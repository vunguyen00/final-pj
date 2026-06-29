import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 20;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chỉ giảng viên mới có thể xem thông báo doanh thu." }, { status: 403 });
  }

  const url = new URL(request.url);
  const skip = parsePositiveInt(url.searchParams.get("skip"), 0);
  const requestedTake = parsePositiveInt(url.searchParams.get("take"), DEFAULT_PAGE_SIZE);
  const take = Math.min(requestedTake, MAX_PAGE_SIZE);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      title: { contains: "doanh thu", mode: "insensitive" },
    },
    select: { id: true, title: true, body: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    skip,
    take: take + 1,
  });

  const page = notifications.slice(0, take);

  return NextResponse.json({
    notifications: page.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    hasMore: notifications.length > take,
  });
}
