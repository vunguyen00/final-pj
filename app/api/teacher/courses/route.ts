import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeCourseThumbnailUrl } from "@/lib/course-thumbnail";

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [courses, languages, teacherLanguage] = await Promise.all([
      prisma.course.findMany({
      where: user.role === "ADMIN" 
        ? {} 
        : { instructorId: user.id },
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
        _count: {
          select: {
            enrollments: true,
            tests: true,
            modules: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      }),
      user.role === "ADMIN"
        ? prisma.learningLanguage.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" },
          })
        : prisma.teacherApplication
            .findMany({
              where: { userId: user.id, status: "APPROVED" },
              select: { language: { select: { id: true, name: true, code: true } } },
              orderBy: { reviewedAt: "desc" },
            })
            .then((applications) => {
              const seen = new Set<string>();
              return applications.flatMap((application) => {
                if (!application.language || seen.has(application.language.id)) return [];
                seen.add(application.language.id);
                return [application.language];
              });
            }),
      user.role === "TEACHER"
        ? prisma.teacherApplication.findFirst({
            where: { userId: user.id, status: "APPROVED" },
            select: { language: { select: { id: true, name: true, code: true } } },
            orderBy: { reviewedAt: "desc" },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ courses, languages, teacherLanguage: teacherLanguage?.language ?? null });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, price, category, level, duration, thumbnail, languageId } = body;

    if (!name || !description || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    const approvedApplication = user.role === "TEACHER"
      ? await prisma.teacherApplication.findFirst({
            where: {
              userId: user.id,
              status: "APPROVED",
              ...(typeof languageId === "string" && languageId ? { languageId } : {}),
            },
            select: { languageId: true },
            orderBy: { reviewedAt: "desc" },
          })
      : null;

    if (user.role === "TEACHER" && typeof languageId === "string" && languageId && !approvedApplication) {
      return NextResponse.json(
        { error: "You can only assign an approved teaching language to this course" },
        { status: 403 },
      );
    }
    // Khóa học mới chưa thể công khai trước khi có chương, bài học và bài kiểm tra.
    const nextStatus = "PENDING_APPROVAL";

    const course = await prisma.course.create({
      data: {
        name,
        description,
        price: normalizedPrice,
        category: category || null,
        level: level || null,
        duration: duration || null,
        thumbnail: normalizeCourseThumbnailUrl(thumbnail) || null,
        status: nextStatus,
        instructorId: user.id,
        languageId:
          user.role === "TEACHER"
            ? approvedApplication?.languageId ?? null
            : typeof languageId === "string" && languageId
              ? languageId
              : null,
      },
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

    return NextResponse.json(
      {
        course,
        requiresApproval: user.role === "TEACHER" && nextStatus === "PENDING_APPROVAL",
        autoApproved: false,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
