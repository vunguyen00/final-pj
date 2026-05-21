import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LearningContent from "./components/LearningContent";

export default async function StudentHocBaiPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireUser();
  const { courseId } = await searchParams;
  const normalizedCourseId = typeof courseId === "string" ? courseId.trim() : "";

  if (!normalizedCourseId) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">Thieu courseId</h1>
          <p className="mt-3 text-slate-700">
            Khong xac dinh duoc khoa hoc can hoc. Vui long mo khoa hoc tu danh sach da dang ky.
          </p>
          <Link href="/my-courses" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Den khoa hoc cua toi
          </Link>
        </div>
      </main>
    );
  }

  const course = await prisma.course.findUnique({
    where: { id: normalizedCourseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: true,
        },
      },
    },
  });

  if (!course) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">Khong tim thay khoa hoc</h1>
          <p className="mt-3 text-slate-700">Khoa hoc khong ton tai.</p>
          <Link href="/courses" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Den trang khoa hoc
          </Link>
        </div>
      </main>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const isInstructor = course.instructorId === user.id;
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: normalizedCourseId,
      },
    },
  });
  const canAccess = isAdmin || isInstructor || Boolean(enrollment);

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">Khong tim thay khoa hoc</h1>
          <p className="mt-3 text-slate-700">
            Khoa hoc khong ton tai hoac ban chua dang ky khoa hoc nay.
          </p>
          <Link href="/my-courses" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Den khoa hoc cua toi
          </Link>
        </div>
      </main>
    );
  }

  const feedbacks = await prisma.feedback.findMany({
    where: {
      userId: user.id,
      content: {
        startsWith: "PROGRESS:",
      },
    },
    select: {
      content: true,
    },
  });

  const completedIds = feedbacks.map((item) => item.content.replace("PROGRESS:", ""));
  const activeCourse = course;

  return (
    <main className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 p-4">
      <div className="mx-auto flex h-full max-w-[1400px] min-h-0 flex-col">
        <h1 className="text-3xl font-bold text-slate-900">Hoc bai: {activeCourse.name}</h1>
        <p className="mt-2 text-slate-600">Bo cuc 3:7, cot trai la module, cot phai la noi dung/video bai hoc.</p>
        <div className="mt-4 min-h-0 flex-1">
          <LearningContent modules={activeCourse.modules} completedIds={completedIds} courseId={activeCourse.id} />
        </div>
      </div>
    </main>
  );
}
