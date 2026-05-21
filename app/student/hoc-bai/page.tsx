import Link from "next/link";
import { LANGUAGES } from "@/app/components/learningMarketplace";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LearningContent from "./components/LearningContent";

const words = [
  ["negotiate", "dam phan", "/nəˈɡoʊʃieɪt/", "We need to negotiate the deadline.", "Review", "Medium", "Business", "Tomorrow"],
  ["sustainable", "ben vung", "/səˈsteɪnəbl/", "Sustainable habits compound over time.", "Learning", "Hard", "Academic", "3 days"],
  ["context", "ngu canh", "/ˈkɑːntekst/", "Use context to infer meaning.", "Mastered", "Easy", "Reading", "Next week"],
];

export default async function StudentHocBaiPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireUser();
  const { courseId } = await searchParams;
  const normalizedCourseId = typeof courseId === "string" ? courseId.trim() : "";

  if (!normalizedCourseId) {
    return <VocabularyDashboard username={user.username} />;
  }

  const course = await prisma.course.findUnique({
    where: { id: normalizedCourseId },
    include: {
      modules: { orderBy: { order: "asc" }, include: { lessons: true } },
    },
  });

  if (!course) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Course not found</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">This course does not exist.</p>
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
      <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Access unavailable</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">You are not enrolled in this course.</p>
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

  return (
    <main className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mx-auto flex h-full max-w-[1400px] min-h-0 flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Course player</p>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-white">{course.name}</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Modules on the left, lesson content and media on the right.</p>
          </div>
          <Link href="/student/hoc-bai" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Vocabulary dashboard
          </Link>
        </div>
        <div className="mt-4 min-h-0 flex-1">
          <LearningContent modules={course.modules} completedIds={completedIds} courseId={course.id} />
        </div>
      </div>
    </main>
  );
}

function VocabularyDashboard({ username }: { username: string }) {
  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Vocabulary manager</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Review queue for {username}</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Manage vocabulary by language, study group, mastery status, and next review date.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {["Review queue", "Mastered", "Difficult words", "Study streak"].map((label, index) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{[24, 138, 12, 9][index]}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((language, index) => (
              <button key={language} type="button" className={`rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                {language}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {["Flashcards", "Quiz", "Typing", "Listening recall", "Speaking review"].map((mode) => (
              <button key={mode} type="button" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Vocabulary groups</h2>
            <div className="mt-4 space-y-3">
              {["Academic English", "Travel Japanese", "HSK Core", "TOPIK Daily"].map((group, index) => (
                <div key={group} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white">{group}</p>
                    <span className="text-sm text-slate-500">{30 + index * 12} words</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${40 + index * 12}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Flashcards</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {words.map((word) => (
                <div key={word[0]} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-lg font-bold text-slate-950 dark:text-white">{word[0]}</p>
                  <p className="mt-1 text-sm text-slate-500">{word[2]}</p>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{word[1]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="font-bold text-slate-950 dark:text-white">Vocabulary table</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {["Word", "Meaning", "Pronunciation", "Example", "Status", "Difficulty", "Notes", "Next review"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {words.map((word) => (
                  <tr key={word[0]}>
                    {word.map((cell) => (
                      <td key={`${word[0]}-${cell}`} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
