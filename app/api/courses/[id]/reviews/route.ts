import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  canReviewCourse,
  getCourseReviews,
  getUserCourseReview,
  upsertCourseReview,
} from "@/lib/course-reviews";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [reviews, myReview, canReview] = await Promise.all([
    getCourseReviews(id),
    user?.role === "STUDENT" ? getUserCourseReview(user.id, id) : Promise.resolve(null),
    user?.role === "STUDENT" ? canReviewCourse(user.id, id) : Promise.resolve(false),
  ]);

  return NextResponse.json({ reviews, myReview, canReview });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Bạn cần đăng nhập bằng tài khoản học viên." }, { status: 401 });
    }

    const allowed = await canReviewCourse(user.id, id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn cần hoàn thành khóa học và đạt bài test trước khi đánh giá." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    await upsertCourseReview({
      userId: user.id,
      courseId: id,
      rating: Number(body.rating),
      comment: String(body.comment || ""),
    });

    const reviews = await getCourseReviews(id);
    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RATING") {
      return NextResponse.json({ error: "Điểm đánh giá phải từ 1 đến 5." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_COMMENT") {
      return NextResponse.json({ error: "Bình luận tối đa 1.000 ký tự." }, { status: 400 });
    }

    console.error("Error saving course review:", error);
    return NextResponse.json({ error: "Không lưu được đánh giá." }, { status: 500 });
  }
}
