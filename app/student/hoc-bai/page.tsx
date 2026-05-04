import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LearningContent from "./components/LearningContent";

export default async function StudentHocBaiPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { courseId } = await searchParams;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              lessons: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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

  if (enrollments.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">Chua co khoa hoc nao</h1>
          <p className="mt-3 text-slate-700">Ban can dang ky khoa hoc truoc khi hoc.</p>
          <Link href="/courses" className="mt-4 inline-block text-blue-600 hover:text-blue-700">Den trang khoa hoc</Link>
        </div>
      </main>
    );
  }

  const activeEnrollment = enrollments.find((item) => item.course.id === courseId) ?? enrollments[0];
  const activeCourse = activeEnrollment.course;

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
