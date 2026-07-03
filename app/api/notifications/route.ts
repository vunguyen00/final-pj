import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TAKE = 10;

function parseTake(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_TAKE) : 5;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ notifications: [] });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") !== "0";
  const take = parseTake(url.searchParams.get("take"));

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    select: {
      id: true,
      title: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({
    notifications: notifications.map((item) => ({
      ...item,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
