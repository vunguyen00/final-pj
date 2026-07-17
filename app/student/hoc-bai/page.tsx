import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCourseLearningLabels } from "@/lib/language-display";
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
    redirect("/my-courses");
  }

  const course = await prisma.course.findUnique({
    where: { id: normalizedCourseId },
    include: {
      language: { select: { name: true, code: true } },
      modules: { orderBy: { order: "asc" }, include: { lessons: true } },
    },
  });

  if (!course) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-950">Course not found</h1>
          <p className="mt-3 text-slate-600">This course does not exist.</p>
          <Link href="/courses" className="mt-4 inline-block text-blue-600 hover:text-blue-700">Go to courses</Link>
        </div>
      </main>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const isInstructor = course.instructorId === user.id;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: normalizedCourseId } },
  });
  const canAccess = isAdmin || isInstructor || Boolean(enrollment);

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-950">Access unavailable</h1>
          <p className="mt-3 text-slate-600">You are not enrolled in this course.</p>
          <Link href="/my-courses" className="mt-4 inline-block text-blue-600 hover:text-blue-700">Go to my courses</Link>
        </div>
      </main>
    );
  }

  const feedbacks = await prisma.feedback.findMany({
    where: { userId: user.id, content: { startsWith: "PROGRESS:" } },
    select: { content: true },
  });
  const completedIds = feedbacks.map((item) => item.content.replace("PROGRESS:", ""));
  const courseLanguageKey = course.language?.code || course.language?.name || "vi";
  const labels = getCourseLearningLabels(courseLanguageKey);

  return (
    <main className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 p-4">
      <div className="mx-auto flex h-full max-w-[1400px] min-h-0 flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{labels.player}</p>
            <h1 className="text-3xl font-bold text-slate-950">{course.name}</h1>
            <p className="mt-1 text-slate-600">{labels.description}</p>
          </div>
          <Link href="/my-courses" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
            Khóa học của tôi
          </Link>
        </div>
        <div className="mt-4 min-h-0 flex-1">
          <LearningContent modules={course.modules} completedIds={completedIds} courseId={course.id} language={courseLanguageKey} />
        </div>
      </div>
    </main>
  );
}
