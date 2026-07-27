import CourseReportsPanel from "@/app/components/CourseReportsPanel";
import { requireRole } from "@/lib/auth";

export default async function TeacherReportsPage() {
  await requireRole("TEACHER");
  return (
    <main className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <CourseReportsPanel role="TEACHER" />
      </div>
    </main>
  );
}
