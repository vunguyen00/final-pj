import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseAutoApprovalSetting } from "@/lib/course-approval";

const COURSE_STATUSES = new Set(["ACTIVE", "LOCKED", "PENDING_APPROVAL", "REJECTED"]);

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const courses = await prisma.course.findMany({
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
    });

    return NextResponse.json({ courses });
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
    const { name, description, price, category, duration, thumbnail, status } = body;

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

    const autoApproval = user.role === "TEACHER" ? await getCourseAutoApprovalSetting() : { enabled: true };
    const nextStatus =
      user.role === "ADMIN"
        ? status || "ACTIVE"
        : autoApproval.enabled
          ? "ACTIVE"
          : "PENDING_APPROVAL";

    if (!COURSE_STATUSES.has(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid course status" },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        name,
        description,
        price: normalizedPrice,
        category: category || null,
        duration: duration || null,
        thumbnail: thumbnail || null,
        status: nextStatus,
        instructorId: user.id,
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

    return NextResponse.json(
      {
        course,
        requiresApproval: user.role === "TEACHER" && nextStatus === "PENDING_APPROVAL",
        autoApproved: user.role === "TEACHER" && nextStatus === "ACTIVE",
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
