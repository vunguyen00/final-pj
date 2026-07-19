import StudentTestHistoryClient from "./StudentTestHistoryClient";
import { requireRole } from "@/lib/auth";
import { getStudentTestHistoryData } from "@/lib/student-tests-data";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentTestHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    courseId?: string | string[];
    testId?: string | string[];
  }>;
}) {
  const [params, user] = await Promise.all([
    searchParams,
    requireRole("STUDENT", "TEACHER", "ADMIN"),
  ]);
  const courseId = firstParam(params.courseId);
  const testId = firstParam(params.testId);

  let data: Awaited<ReturnType<typeof getStudentTestHistoryData>> = {
    courses: [],
    tests: [],
    history: [],
  };
  let errorMessage = "";
  try {
    data = await getStudentTestHistoryData(user, { courseId, testId });
  } catch (error) {
    console.error("Error fetching test history:", error);
    errorMessage = "Không thể tải lịch sử làm bài.";
  }

  return (
    <StudentTestHistoryClient
      {...data}
      selectedCourseId={courseId ?? "all"}
      selectedTestId={testId ?? "all"}
      error={errorMessage}
    />
  );
}
