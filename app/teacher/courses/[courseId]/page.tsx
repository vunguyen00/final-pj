import { notFound } from "next/navigation";
import CourseDetailClient from "./CourseDetailClient";
import { requireRole } from "@/lib/auth";
import { getTeacherCourseData } from "@/lib/teacher-course-data";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const [{ courseId }, user] = await Promise.all([
    params,
    requireRole("TEACHER", "ADMIN"),
  ]);
  const data = await getTeacherCourseData(user, courseId);

  if (data.kind !== "success") notFound();

  return (
    <CourseDetailClient
      courseId={courseId}
      initialData={{
        course: data.course,
        languages: data.languages,
        viewerRole: data.viewerRole,
      }}
    />
  );
}
