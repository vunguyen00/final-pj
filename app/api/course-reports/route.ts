import { NextRequest, NextResponse } from "next/server";
import { CourseReportCategory, Prisma } from "@/.generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORIES = new Set(Object.values(CourseReportCategory));

function getPagination(request: NextRequest) {
  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("pageSize") ?? "20", 10) || 20));
  return { page, pageSize };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });

  const { page, pageSize } = getPagination(request);
  const search = (request.nextUrl.searchParams.get("search") ?? "").trim().slice(0, 120);
  const accessWhere: Prisma.CourseReportWhereInput =
    user.role === "ADMIN"
      ? {}
      : user.role === "TEACHER"
        ? { course: { instructorId: user.id } }
        : { reporterId: user.id };
  const where: Prisma.CourseReportWhereInput = {
    AND: [
      accessWhere,
      ...(search
        ? [{
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { response: { contains: search, mode: "insensitive" as const } },
              { course: { name: { contains: search, mode: "insensitive" as const } } },
              { lesson: { title: { contains: search, mode: "insensitive" as const } } },
              { reporter: { username: { contains: search, mode: "insensitive" as const } } },
              { reporter: { email: { contains: search, mode: "insensitive" as const } } },
            ],
          }]
        : []),
    ],
  };

  const [items, totalItems] = await Promise.all([
    prisma.courseReport.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, instructorId: true } },
        reporter: { select: { id: true, username: true, email: true } },
        lesson: { select: { id: true, title: true } },
        respondedBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.courseReport.count({ where }),
  ]);

  return NextResponse.json({
    items,
    viewerId: user.id,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
  if (user.role !== "STUDENT") {
    return NextResponse.json({ error: "Chỉ học viên đã ghi danh mới có thể báo cáo khóa học." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
  const lessonId = typeof body.lessonId === "string" && body.lessonId.trim() ? body.lessonId.trim() : null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";

  if (!courseId || !CATEGORIES.has(category as CourseReportCategory)) {
    return NextResponse.json({ error: "Loại báo cáo hoặc khóa học không hợp lệ." }, { status: 400 });
  }
  if (title.length < 5 || title.length > 160 || description.length < 20 || description.length > 5000) {
    return NextResponse.json({ error: "Tiêu đề cần 5–160 ký tự và nội dung cần 20–5000 ký tự." }, { status: 400 });
  }
  if (body.truthfulConfirmed !== true) {
    return NextResponse.json({ error: "Bạn cần xác nhận nội dung báo cáo là đúng sự thật." }, { status: 400 });
  }

  const [enrollment, recentReports, lesson] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { id: true, course: { select: { name: true } } },
    }),
    prisma.courseReport.count({
      where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    }),
    lessonId
      ? prisma.lesson.findFirst({
          where: { id: lessonId, module: { courseId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!enrollment) return NextResponse.json({ error: "Bạn chưa ghi danh khóa học này." }, { status: 403 });
  if (lessonId && !lesson) return NextResponse.json({ error: "Bài học không thuộc khóa học." }, { status: 400 });
  if (recentReports >= 5) return NextResponse.json({ error: "Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau." }, { status: 429 });

  const report = await prisma.$transaction(async (tx) => {
    const [createdReport, admins] = await Promise.all([
      tx.courseReport.create({
        data: {
          courseId,
          reporterId: user.id,
          lessonId,
          category: category as CourseReportCategory,
          title,
          description,
          truthfulConfirmed: true,
        },
      }),
      tx.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      }),
    ]);

    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Có báo cáo khóa học mới",
          body: `${user.username} đã báo cáo khóa học "${enrollment.course.name}": ${title}. Mở mục Báo cáo khóa học để kiểm tra.`,
        })),
      });
    }

    return createdReport;
  });
  return NextResponse.json({ report }, { status: 201 });
}
