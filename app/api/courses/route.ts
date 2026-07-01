import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await authenticate();
    const courses = await prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: {
        instructor: {
          select: {
            id: true,
            username: true,
          },
        },
        language: {
          select: {
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    let enrolledCourseIds: string[] = [];
    if (user?.role === "STUDENT") {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id },
        select: { courseId: true },
      });
      enrolledCourseIds = enrollments.map((item) => item.courseId);
    }

    return NextResponse.json({ courses, enrolledCourseIds });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
