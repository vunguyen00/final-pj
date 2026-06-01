import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseAutoApprovalSetting } from "@/lib/course-approval";

const COURSE_STATUSES = new Set(["ACTIVE", "LOCKED", "PENDING_APPROVAL", "REJECTED"]);

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

    const updateData: Record<string, unknown> = {
      ...(name && { name }),
      ...(description && { description }),
      ...(category !== undefined && { category }),
      ...(duration !== undefined && { duration }),
      ...(thumbnail !== undefined && { thumbnail }),
    };

    if (price !== undefined) {
      const normalizedPrice = Number(price);
      if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
        return NextResponse.json(
          { error: "Invalid price" },
          { status: 400 }
        );
      }
      updateData.price = normalizedPrice;
    }

    if (user.role === "ADMIN") {
      if (status) {
        if (!COURSE_STATUSES.has(status)) {
          return NextResponse.json(
            { error: "Invalid course status" },
            { status: 400 }
          );
        }
        updateData.status = status;
      }
    } else {
      if (course.status !== "LOCKED") {
        const autoApproval = await getCourseAutoApprovalSetting();
        updateData.status = autoApproval.enabled ? "ACTIVE" : "PENDING_APPROVAL";
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: updateData as never,
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

    return NextResponse.json({
      course: updatedCourse,
      requiresApproval: user.role === "TEACHER" && updatedCourse.status === "PENDING_APPROVAL",
    });
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

    if (action === "toggleLock") {
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only admin can lock/unlock courses" },
          { status: 403 }
        );
      }
      if (course.status !== "ACTIVE" && course.status !== "LOCKED") {
        return NextResponse.json(
          { error: "Can only lock or unlock active/locked courses" },
          { status: 400 }
        );
      }
      const newStatus = course.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { status: newStatus },
      });
      return NextResponse.json({ course: updatedCourse });
    }

    if (action === "reviewCourse") {
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only admin can review courses" },
          { status: 403 }
        );
      }

      const decision = body.decision === "APPROVE" ? "APPROVE" : body.decision === "REJECT" ? "REJECT" : null;
      if (!decision) {
        return NextResponse.json(
          { error: "Invalid review decision" },
          { status: 400 }
        );
      }

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { status: decision === "APPROVE" ? "ACTIVE" : "REJECTED" },
      });

      if (course.instructorId) {
        await prisma.notification.create({
          data: {
            userId: course.instructorId,
            title: decision === "APPROVE" ? "Khóa học đã được duyệt" : "Khóa học chưa được duyệt",
            body:
              decision === "APPROVE"
                ? `Khóa học "${course.name}" đã được duyệt và hiển thị công khai.`
                : body.rejectionReason?.trim()
                  ? `Khóa học "${course.name}" bị từ chối. Lý do: ${body.rejectionReason.trim()}`
                  : `Khóa học "${course.name}" bị từ chối. Vui lòng chỉnh sửa và gửi lại.`,
          },
        });
      }

      return NextResponse.json({ course: updatedCourse });
    }

    if (action === "submitForApproval") {
      if (user.role !== "TEACHER") {
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }
      const autoApproval = await getCourseAutoApprovalSetting();
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { status: autoApproval.enabled ? "ACTIVE" : "PENDING_APPROVAL" },
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
