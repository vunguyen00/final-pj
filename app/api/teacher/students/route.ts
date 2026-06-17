import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { COURSE_COMPLETION_POINTS } from "@/lib/ai-points";
import { prisma } from "@/lib/prisma";

const LEGACY_COURSE_POINT_PREFIX = "AI_POINTS:COURSE_COMPLETED:";
const LEGACY_SPENT_POINT_PREFIX = "AI_POINTS:SPENT:";

export async function GET() {
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.role !== "TEACHER" && viewer.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.role === "TEACHER") {
    const enrollments = await prisma.enrollment.findMany({
      where: { course: { instructorId: viewer.id } },
      select: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const studentMap = new Map<
      string,
      {
        id: string;
        username: string;
        email: string;
        courses: { id: string; name: string; enrolledAt: string }[];
      }
    >();

    for (const enrollment of enrollments) {
      const student = studentMap.get(enrollment.user.id) ?? {
        ...enrollment.user,
        courses: [],
      };
      student.courses.push({
        ...enrollment.course,
        enrolledAt: enrollment.createdAt.toISOString(),
      });
      studentMap.set(student.id, student);
    }

    return NextResponse.json({
      viewerRole: viewer.role,
      users: Array.from(studentMap.values()).sort((a, b) =>
        a.username.localeCompare(b.username, "vi"),
      ),
    });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isBanned: true,
      enrollments: {
        select: {
          createdAt: true,
          course: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      teacherApplications: {
        select: {
          certificates: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              expiryDate: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { username: "asc" },
    take: 200,
  });

  const userIds = users.map((user) => user.id);
  const [topUps, purchases, pointGroups, legacyPointRows] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        userId: { in: userIds },
      },
      select: {
        amount: true,
        userId: true,
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { userId: { in: userIds } } },
      select: {
        price: true,
        order: { select: { userId: true } },
      },
    }),
    prisma.pointTransaction.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { amount: true },
    }),
    prisma.feedback.findMany({
      where: {
        userId: { in: userIds },
        OR: [
          { content: { startsWith: LEGACY_COURSE_POINT_PREFIX } },
          { content: { startsWith: LEGACY_SPENT_POINT_PREFIX } },
        ],
      },
      select: { userId: true, content: true },
    }),
  ]);

  const balances = new Map<string, number>();
  for (const topUp of topUps) {
    balances.set(
      topUp.userId,
      (balances.get(topUp.userId) ?? 0) + topUp.amount,
    );
  }
  for (const purchase of purchases) {
    balances.set(
      purchase.order.userId,
      (balances.get(purchase.order.userId) ?? 0) - purchase.price,
    );
  }

  const points = new Map(
    pointGroups.map((group) => [group.userId, group._sum.amount ?? 0]),
  );
  for (const row of legacyPointRows) {
    if (row.content.startsWith(LEGACY_COURSE_POINT_PREFIX)) {
      points.set(row.userId, (points.get(row.userId) ?? 0) + COURSE_COMPLETION_POINTS);
      continue;
    }

    const rawValue = row.content
      .replace(LEGACY_SPENT_POINT_PREFIX, "")
      .split(":")[0];
    const spent = Number(rawValue);
    if (Number.isFinite(spent) && spent > 0) {
      points.set(row.userId, (points.get(row.userId) ?? 0) - spent);
    }
  }

  return NextResponse.json({
    viewerRole: viewer.role,
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
      balance: balances.get(user.id) ?? 0,
      points: Math.max(0, points.get(user.id) ?? 0),
      courses: user.enrollments.map((enrollment) => ({
        ...enrollment.course,
        enrolledAt: enrollment.createdAt.toISOString(),
      })),
      certificates: user.teacherApplications[0]?.certificates ?? [],
    })),
  });
}
