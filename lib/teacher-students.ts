import type { AppRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CourseEnrollment = {
  id: string;
  name: string;
  enrolledAt: string;
};

export type CertificateSummary = {
  id: string;
  fileName: string;
  fileUrl: string;
  expiryDate: string | null;
};

export type ManagedUser = {
  id: string;
  username: string;
  email: string;
  role?: string;
  isBanned?: boolean;
  balance?: number;
  points?: number;
  courses: CourseEnrollment[];
  certificates?: CertificateSummary[];
};

export type StudentsManagementData = {
  viewerRole: "TEACHER" | "ADMIN";
  users: ManagedUser[];
};

type Viewer = {
  id: string;
  role: AppRole;
};

async function getTeacherStudents(viewerId: string): Promise<ManagedUser[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { course: { instructorId: viewerId } },
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

  const studentMap = new Map<string, ManagedUser>();

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

  return Array.from(studentMap.values()).sort((a, b) => a.username.localeCompare(b.username, "vi"));
}

async function getAdminManagedUsers(): Promise<ManagedUser[]> {
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
  const [topUps, purchases, pointGroups] = await Promise.all([
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
      where: {
        userId: { in: userIds },
        OR: [
          { type: { in: ["AI_POINTS_PURCHASE", "AI_POINTS_ADMIN_GRANT"] } },
          { type: { endsWith: "_SPENT" } },
        ],
      },
      _sum: { amount: true },
    }),
  ]);

  const balances = new Map<string, number>();
  for (const topUp of topUps) {
    balances.set(topUp.userId, (balances.get(topUp.userId) ?? 0) + topUp.amount);
  }
  for (const purchase of purchases) {
    balances.set(purchase.order.userId, (balances.get(purchase.order.userId) ?? 0) - purchase.price);
  }

  const points = new Map(pointGroups.map((group) => [group.userId, group._sum.amount ?? 0]));

  return users.map((user) => ({
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
    certificates:
      user.teacherApplications[0]?.certificates.map((certificate) => ({
        ...certificate,
        expiryDate: certificate.expiryDate?.toISOString() ?? null,
      })) ?? [],
  }));
}

export async function getStudentsManagementData(viewer: Viewer): Promise<StudentsManagementData> {
  if (viewer.role === "TEACHER") {
    return {
      viewerRole: viewer.role,
      users: await getTeacherStudents(viewer.id),
    };
  }

  if (viewer.role === "ADMIN") {
    return {
      viewerRole: viewer.role,
      users: await getAdminManagedUsers(),
    };
  }

  throw new Error("Unauthorized");
}
