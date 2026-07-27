import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCourseLearningLabels } from "@/lib/language-display";
import { getCourseLearningGateState } from "@/lib/course-learning-gates";
import LearningContent from "./components/LearningContent";

export default async function StudentHocBaiPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; lessonId?: string }>;
}) {
  const user = await requireUser();
  const { courseId, lessonId } = await searchParams;
  const normalizedCourseId = typeof courseId === "string" ? courseId.trim() : "";

  if (!normalizedCourseId) {
    redirect("/my-courses");
  }

  const course = await prisma.course.findUnique({
    where: { id: normalizedCourseId },
    include: {
      language: { select: { name: true, code: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: true,
          tests: {
            where: { kind: "COURSE" },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true },
          },
        },
      },
      tests: {
        where: { kind: "COURSE", moduleId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!course) {
    return (
      <main className="min-h-dvh bg-slate-50 p-6">
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
  const refundPending = enrollment?.accessStatus === "REFUND_PENDING";
  const canAccess = isAdmin || isInstructor || enrollment?.accessStatus === "ACTIVE";

  if (!canAccess) {
    return (
      <main className="min-h-dvh bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-950">Không thể truy cập khóa học</h1>
          <p className="mt-3 text-slate-600">
            {refundPending
              ? "Quyền học đang tạm khóa trong khi yêu cầu hoàn tiền được xử lý. Nếu yêu cầu bị từ chối, bạn sẽ có thể tiếp tục từ tiến độ hiện tại."
              : "Bạn chưa đăng ký khóa học này."}
          </p>
          <Link href="/my-courses" className="mt-4 inline-block text-blue-600 hover:text-blue-700">Go to my courses</Link>
        </div>
      </main>
    );
  }

  const gateState = await getCourseLearningGateState(user.id, course.id);
  const completedIds = Array.from(gateState?.completedLessonIds ?? []);
  const passedTestIds = Array.from(gateState?.passedTestIds ?? []);
  const unlockedModuleIds = new Set<string>();
  if (isAdmin || isInstructor) {
    for (const courseModule of course.modules) unlockedModuleIds.add(courseModule.id);
  } else {
    for (const courseModule of gateState?.modules ?? []) {
      if (courseModule.isUnlocked) unlockedModuleIds.add(courseModule.id);
    }
  }
  const learningModules = course.modules.map((module) => {
    const isUnlocked = unlockedModuleIds.has(module.id);
    return {
      ...module,
      isUnlocked,
      lessons: module.lessons.map((courseLesson) => ({
        ...courseLesson,
        content: isUnlocked ? courseLesson.content : "",
        videoUrl: isUnlocked ? courseLesson.videoUrl : null,
      })),
    };
  });
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
          <LearningContent
            modules={learningModules}
            courseTests={course.tests}
            completedIds={completedIds}
            passedTestIds={passedTestIds}
            courseId={course.id}
            language={courseLanguageKey}
            initialLessonId={typeof lessonId === "string" ? lessonId : null}
            bypassGates={isAdmin || isInstructor}
          />
        </div>
      </div>
    </main>
  );
}
