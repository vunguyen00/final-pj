import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        modules: {
          include: {
            lessons: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        tests: {
          select: {
            id: true,
            name: true,
            maxScore: true,
            passingScore: true,
            maxAttempts: true,
            timeLimit: true,
            _count: {
              select: {
                questions: true,
                attempts: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
            tests: true,
            feedbacks: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, price, category, duration, thumbnail, status } = body;

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(category !== undefined && { category }),
        ...(duration !== undefined && { duration }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(status && { status }),
      },
      include: {
        instructor: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ course: updatedCourse });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Toggle lock/unlock
    if (action === "toggleLock") {
      const newStatus = course.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { status: newStatus },
      });
      return NextResponse.json({ course: updatedCourse });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error toggling course status:", error);
    return NextResponse.json(
      { error: "Failed to toggle course status" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Check if course has enrollments
    const enrollmentCount = await prisma.enrollment.count({
      where: { courseId },
    });

    if (enrollmentCount > 0) {
      // Instead of deleting, lock the course
      const lockedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { status: "LOCKED" },
      });
      return NextResponse.json({ 
        course: lockedCourse,
        message: "Course has enrollments, so it has been locked instead of deleted"
      });
    }

    // Delete related records first
    await prisma.testAttempt.deleteMany({
      where: { test: { courseId } },
    });

    await prisma.question.deleteMany({
      where: { test: { courseId } },
    });

    await prisma.test.deleteMany({
      where: { courseId },
    });

    await prisma.lesson.deleteMany({
      where: { module: { courseId } },
    });

    await prisma.module.deleteMany({
      where: { courseId },
    });

    await prisma.enrollment.deleteMany({
      where: { courseId },
    });

    await prisma.feedback.deleteMany({
      where: { courseId },
    });

    await prisma.orderItem.deleteMany({
      where: { courseId },
    });

    // Delete the course
    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}