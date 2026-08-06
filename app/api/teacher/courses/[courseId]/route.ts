import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseAutoApprovalSetting } from "@/lib/course-approval";
import { normalizeCourseThumbnailUrl } from "@/lib/course-thumbnail";
import { sendBasicEmail } from "@/lib/mailer";
import { getCourseReadiness } from "@/lib/course-readiness";

const COURSE_STATUSES = new Set(["ACTIVE", "LOCKED", "PENDING_APPROVAL", "PENDING_DELETE", "REJECTED"]);

async function deleteCourseWithRelations(courseId: string) {
  return prisma.$transaction(async (tx) => {
    const [enrollments, orderItems, payments] = await Promise.all([
      tx.enrollment.count({ where: { courseId } }),
      tx.orderItem.count({ where: { courseId } }),
      tx.payment.count({ where: { courseId } }),
    ]);
    if (enrollments > 0 || orderItems > 0 || payments > 0) {
      const course = await tx.course.update({
        where: { id: courseId },
        data: { status: "LOCKED", deleteRequestedFromStatus: null },
      });
      return { deleted: false, archived: true, course };
    }
    const tests = await tx.test.findMany({
      where: { courseId },
      select: { id: true },
    });
    const testIds = tests.map((test) => test.id);

    if (testIds.length > 0) {
      const attempts = await tx.testAttempt.findMany({
        where: { testId: { in: testIds } },
        select: { id: true },
      });
      const attemptIds = attempts.map((attempt) => attempt.id);

      if (attemptIds.length > 0) {
        await tx.antiCheatLog.deleteMany({
          where: { testAttemptId: { in: attemptIds } },
        });
        await tx.cheatingLog.deleteMany({
          where: { attemptId: { in: attemptIds } },
        });
      }

      await tx.testAttempt.deleteMany({
        where: { testId: { in: testIds } },
      });
      await tx.answer.deleteMany({
        where: { question: { testId: { in: testIds } } },
      });
      await tx.question.deleteMany({
        where: { testId: { in: testIds } },
      });
    }

    await tx.courseRefundRequest.deleteMany({ where: { courseId } });
    await tx.aiAssessment.updateMany({ where: { courseId }, data: { courseId: null } });
    await tx.pointTransaction.updateMany({ where: { courseId }, data: { courseId: null } });
    await tx.learningActivity.updateMany({ where: { courseId }, data: { courseId: null } });
    await tx.payment.updateMany({ where: { courseId }, data: { courseId: null } });
    await tx.test.deleteMany({ where: { courseId } });
    await tx.lesson.deleteMany({ where: { module: { courseId } } });
    await tx.module.deleteMany({ where: { courseId } });
    await tx.enrollment.deleteMany({ where: { courseId } });
    await tx.feedback.deleteMany({ where: { courseId } });
    await tx.orderItem.deleteMany({ where: { courseId } });
    await tx.course.delete({ where: { id: courseId } });
    return { deleted: true, archived: false, course: null };
  });
}

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
        language: {
          select: {
            id: true,
            name: true,
            code: true,
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
            timeLimit: true,
            module: { select: { id: true, name: true } },
            lesson: { select: { id: true, title: true } },
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

    const fixedTeacherLanguage =
      user.role === "TEACHER" && !course.language
        ? await prisma.teacherApplication.findFirst({
            where: { userId: user.id, status: { in: ["APPROVED", "CONVERTED_TO_TEACHER"] } },
            select: {
              language: { select: { id: true, name: true, code: true } },
            },
            orderBy: { reviewedAt: "desc" },
          })
        : null;
    const languages =
      user.role === "ADMIN"
        ? await prisma.learningLanguage.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" },
          })
        : course.language || fixedTeacherLanguage?.language
          ? [course.language ?? fixedTeacherLanguage!.language]
          : [];

    return NextResponse.json({ course, languages, viewerRole: user.role });
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
      include: {
        instructor: { select: { id: true, username: true, email: true } },
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

    if (user.role === "TEACHER" && course.status === "PENDING_DELETE") {
      return NextResponse.json(
        { error: "Course deletion is pending admin approval" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, price, category, level, duration, thumbnail, status, languageId } = body;

    const updateData: Record<string, unknown> = {
      ...(name && { name }),
      ...(description && { description }),
      ...(category !== undefined && { category }),
      ...(level !== undefined && { level }),
      ...(duration !== undefined && { duration }),
      ...(thumbnail !== undefined && { thumbnail: normalizeCourseThumbnailUrl(thumbnail) || null }),
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

    if (typeof languageId === "string" && languageId && user.role === "ADMIN") {
        const language = await prisma.learningLanguage.findFirst({
          where: { id: languageId, isActive: true },
          select: { id: true },
        });
        if (!language) {
          return NextResponse.json(
            { error: "Invalid course language" },
            { status: 400 },
          );
        }
        updateData.languageId = languageId;
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
        updateData.deleteRequestedFromStatus = null;
      }
    } else {
      if (!course.languageId) {
        const approvedApplication = await prisma.teacherApplication.findFirst({
          where: { userId: user.id, status: { in: ["APPROVED", "CONVERTED_TO_TEACHER"] } },
          select: { languageId: true },
          orderBy: { reviewedAt: "desc" },
        });
        if (approvedApplication) {
          updateData.languageId = approvedApplication.languageId;
        }
      }
      if (course.status !== "LOCKED") {
        const autoApproval = await getCourseAutoApprovalSetting();
        updateData.status = autoApproval.enabled ? "ACTIVE" : "PENDING_APPROVAL";
        updateData.deleteRequestedFromStatus = null;
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
        language: {
          select: {
            id: true,
            name: true,
            code: true,
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
      include: {
        instructor: { select: { id: true, username: true, email: true } },
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
      if (newStatus === "ACTIVE") {
        const readiness = await getCourseReadiness(courseId);
        if (!readiness.ready) {
          return NextResponse.json({ error: readiness.errors.join(" ") }, { status: 400 });
        }
      }
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { status: newStatus },
      });

      if (newStatus === "LOCKED" && course.instructorId && course.instructor) {
        const title = "Khóa học của bạn đã bị khóa";
        const body = `Khóa học "${course.name}" đã bị admin khóa. Vui lòng kiểm tra lại nội dung khóa học hoặc liên hệ admin nếu cần hỗ trợ.`;

        await prisma.notification.create({
          data: {
            userId: course.instructorId,
            title,
            body,
          },
        });

        try {
          await sendBasicEmail(course.instructor.email, title, body);
          await prisma.emailLog.create({
            data: {
              userId: course.instructorId,
              to: course.instructor.email,
              subject: title,
              status: "SENT",
              sentAt: new Date(),
            },
          });
        } catch (emailError) {
          await prisma.emailLog.create({
            data: {
              userId: course.instructorId,
              to: course.instructor.email,
              subject: title,
              status: "FAILED",
              error: emailError instanceof Error ? emailError.message.slice(0, 500) : "Unknown email error",
            },
          });
        }
      }
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

      if (course.status === "PENDING_DELETE") {
        if (decision === "APPROVE") {
          const deletion = await deleteCourseWithRelations(courseId);
          if (course.instructorId) {
            await prisma.notification.create({
              data: {
                userId: course.instructorId,
                title: deletion.archived
                  ? "Khóa học đã được lưu trữ"
                  : "Yêu cầu xóa khóa học đã được duyệt",
                body: deletion.archived
                  ? `Khóa học "${course.name}" có người học hoặc giao dịch nên đã được khóa để bảo toàn lịch sử.`
                  : `Khóa học "${course.name}" đã được admin duyệt xóa.`,
              },
            });
          }
          return NextResponse.json({ ...deletion, courseId });
        }

        const restoredStatus = course.deleteRequestedFromStatus ?? "ACTIVE";
        const updatedCourse = await prisma.course.update({
          where: { id: courseId },
          data: {
            status: restoredStatus,
            deleteRequestedFromStatus: null,
          },
        });

        if (course.instructorId) {
          await prisma.notification.create({
            data: {
              userId: course.instructorId,
              title: "Yêu cầu xóa khóa học bị từ chối",
              body: body.rejectionReason?.trim()
                ? `Yêu cầu xóa khóa học "${course.name}" bị từ chối. Lý do: ${body.rejectionReason.trim()}`
                : `Yêu cầu xóa khóa học "${course.name}" bị từ chối.`,
            },
          });
        }

        return NextResponse.json({ course: updatedCourse });
      }

      const approvedApplication =
        !course.languageId && course.instructorId
          ? await prisma.teacherApplication.findFirst({
              where: { userId: course.instructorId, status: { in: ["APPROVED", "CONVERTED_TO_TEACHER"] } },
              select: { languageId: true },
              orderBy: { reviewedAt: "desc" },
            })
          : null;
      if (decision === "APPROVE") {
        const readiness = await getCourseReadiness(courseId);
        if (!readiness.ready) {
          return NextResponse.json({ error: readiness.errors.join(" ") }, { status: 400 });
        }
      }
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          status: decision === "APPROVE" ? "ACTIVE" : "REJECTED",
          deleteRequestedFromStatus: null,
          ...(approvedApplication
            ? { languageId: approvedApplication.languageId }
            : {}),
        },
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
      if (course.status === "PENDING_DELETE") {
        return NextResponse.json(
          { error: "Course deletion is pending admin approval" },
          { status: 400 }
        );
      }
      const readiness = await getCourseReadiness(courseId);
      if (!readiness.ready) {
        return NextResponse.json({ error: readiness.errors.join(" ") }, { status: 400 });
      }
      const autoApproval = await getCourseAutoApprovalSetting();
      const approvedApplication = !course.languageId
        ? await prisma.teacherApplication.findFirst({
            where: { userId: user.id, status: { in: ["APPROVED", "CONVERTED_TO_TEACHER"] } },
            select: { languageId: true },
            orderBy: { reviewedAt: "desc" },
          })
        : null;
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          status: autoApproval.enabled ? "ACTIVE" : "PENDING_APPROVAL",
          deleteRequestedFromStatus: null,
          ...(approvedApplication
            ? { languageId: approvedApplication.languageId }
            : {}),
        },
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

    if (user.role === "ADMIN") {
      const deletion = await deleteCourseWithRelations(courseId);
      return NextResponse.json({ success: true, ...deletion });
    }

    if (course.status === "PENDING_DELETE") {
      return NextResponse.json({
        course,
        requiresApproval: true,
        message: "Course deletion is already pending admin approval",
      });
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: "PENDING_DELETE",
        deleteRequestedFromStatus: course.status,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Yêu cầu xóa khóa học",
          body: `Giảng viên yêu cầu xóa khóa học "${course.name}". Vui lòng duyệt trong trang quản trị.`,
        })),
      });
    }

    return NextResponse.json({
      course: updatedCourse,
      requiresApproval: true,
      message: "Course deletion request has been sent to admin for approval",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
