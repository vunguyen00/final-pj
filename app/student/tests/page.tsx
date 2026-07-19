import StudentTestsClient from "./StudentTestsClient";
import { requireRole } from "@/lib/auth";
import { getStudentTestsData } from "@/lib/student-tests-data";

export default async function StudentTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string | string[] }>;
}) {
  const [params, user] = await Promise.all([
    searchParams,
    requireRole("STUDENT", "TEACHER", "ADMIN"),
  ]);
  const courseId = Array.isArray(params.courseId)
    ? params.courseId[0]
    : params.courseId;

  let tests: Awaited<ReturnType<typeof getStudentTestsData>>["tests"] = [];
  let errorMessage = "";
  try {
    ({ tests } = await getStudentTestsData(user, courseId));
  } catch (error) {
    console.error("Error fetching student tests:", error);
    errorMessage = "Không thể tải danh sách bài test.";
  }

  return <StudentTestsClient tests={tests} error={errorMessage} />;
}
